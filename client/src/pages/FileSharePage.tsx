import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Description from "../components/Description";
import { FileUploader } from "react-drag-drop-files";
import CopyLink from "../components/FileShare/CopyLink";
import DownloadButton from "../components/DownloadButton";
import socketService from "../services/socketService";
import apiService from "../services/apiService";
import { FileData, InternalFileData, Room } from "../types/Room";
import { v4 as uuidv4 } from "uuid";
import FileTransferService from "../services/FileTransferService";

const CHUNK_SIZE = 16384;

const FileUploadComponent = ({ onUploadFile }: { onUploadFile: (fileList: File[]) => void }) => {
    return (
        <div>
            <FileUploader
                name="file"
                multiple={true}
                label="UPLOAD HERE"
                onDrop={(e: FileList) => {
                    const files = Array.from(e);
                    onUploadFile(files);
                }}
                onSelect={(e: FileList) => {
                    const files = Array.from(e);
                    onUploadFile(files);
                }}
            />
        </div>
    );
};

const FileSharePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [fileList, setFileList] = useState<FileData[]>([]);
    const [userCount, setUserCount] = useState(0);
    const [internalFileList, setInternalFileList] = useState<InternalFileData[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const dataChannel = useRef<RTCDataChannel | null>(null);
    const fileBuffer = useRef<{ [fileName: string]: Blob[] }>({});
    const currentFileMetadata = useRef<any>(null);
    const progressBar = useRef<HTMLProgressElement | null>(null);

    const iceCandidateQueue: RTCIceCandidate[] = [];

    useEffect(() => {
        FileTransferService.setInternalFileList(internalFileList);
    }, [internalFileList]);

    const handleRefreshRoomStatus = async (data: Room) => {
        const room = data;
        setFileList(room.files);
        setUserCount(room.users.length);
    };

    const refreshRoomStatus = () => {
        socketService.emit("roomStatus", id);
    };

    useEffect(() => {
        if (!id || id.length !== 6) {
            alert("방 ID 길이는 6자리여야 합니다.");
            window.location.href = "/";
            return;
        }

        socketService.connect(id);

        socketService.on("roomStatus", (data) => {
            handleRefreshRoomStatus(data);
        });

        socketService.on("fileRequestResponse", (fileId: string) => {
            const file = internalFileList.find((file) => file.fileId === fileId);
            if (file) {
                console.log("Sending file:", file.file.name);
                sendFile(file.file);
            } else {
                console.error("File not found in internal list:", fileId);
            }
        });

        socketService.on("receiveOffer", async ({ sdp, requesterId }) => {
            if (peerConnection.current) {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);
                socketService.emit("sendAnswer", {
                    sdp: peerConnection.current.localDescription,
                    target: requesterId,
                });
            }
        });

        socketService.on("receiveAnswer", async (sdp) => {
            if (peerConnection.current) {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
            }
        });

        socketService.on("iceCandidate", async (candidate) => {
            if (peerConnection.current) {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

        return () => {
            socketService.disconnect(id);
        };
    }, [id, internalFileList]);

    useEffect(() => {
        if (peerConnection.current) return;

        peerConnection.current = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                socketService.emit("iceCandidate", { candidate: event.candidate, target: peerConnection.current!.remoteDescription!.sdp });
                console.log("ICE candidate sent:", event.candidate);
            } else {
                console.log("All ICE candidates have been sent");
            }
        };

        peerConnection.current.ondatachannel = (event) => {
            console.log("Data channel received:", event.channel);
            dataChannel.current = event.channel;
            setupDataChannel(dataChannel.current);
        };

        socketService.on("message", async (data) => {
            if (data.candidate) {
                console.log("Received ICE candidate:", data.candidate);
                if (peerConnection.current?.remoteDescription && peerConnection.current.remoteDescription.type) {
                    try {
                        await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                        console.log("ICE candidate added successfully");
                    } catch (e) {
                        console.error("Error adding received ICE candidate", e);
                    }
                } else {
                    iceCandidateQueue.push(data.candidate);
                }
            } else if (data.sdp) {
                console.log("Received SDP:", data.sdp);
                try {
                    if (peerConnection.current) {
                        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
                        console.log("Remote SDP set successfully");
                        while (iceCandidateQueue.length) {
                            const candidate = iceCandidateQueue.shift();
                            try {
                                await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                                console.log("Queued ICE candidate added successfully");
                            } catch (e) {
                                console.error("Error adding queued ICE candidate", e);
                            }
                        }
                    }
                    if (peerConnection.current && data.sdp.type === "offer") {
                        const answer = await peerConnection.current.createAnswer();
                        await peerConnection.current.setLocalDescription(answer);
                        socketService.emit("message", { sdp: peerConnection.current.localDescription });
                        console.log("Answer sent:", peerConnection.current.localDescription);
                    }
                } catch (e) {
                    console.error("Error setting remote SDP", e);
                }
            }
        });
    }, []);

    const setupDataChannel = (channel: RTCDataChannel) => {
        channel.onopen = () => {
            console.log("Data channel is open");
        };
        channel.onclose = () => {
            console.log("Data channel is closed");
        };
        channel.onmessage = (event) => {
            const receivedData = event.data;

            if (typeof receivedData === "string") {
                const metadata = JSON.parse(receivedData);
                currentFileMetadata.current = metadata;
                fileBuffer.current[metadata.fileName] = [];
                if (progressBar.current) {
                    progressBar.current.value = 0;
                    progressBar.current.max = metadata.fileSize;
                    progressBar.current.style.display = "block";
                }
            } else {
                const fileBufferList = fileBuffer.current[currentFileMetadata.current.fileName];
                fileBufferList.push(receivedData);
                if (progressBar.current) {
                    progressBar.current.value += receivedData.size;
                }
                console.log(`Received chunk: ${fileBufferList.length}, size: ${receivedData.size}`);

                if (fileBufferList.reduce((acc, chunk) => acc + chunk.size, 0) === currentFileMetadata.current.fileSize) {
                    const blob = new Blob(fileBufferList);
                    saveFile(blob, currentFileMetadata.current.fileName);
                    console.log("File received completely:", currentFileMetadata.current.fileName);
                    if (progressBar.current) {
                        progressBar.current.style.display = "none";
                    }
                }
            }
        };
        channel.onerror = (error) => {
            console.error("Data channel error:", error);
        };
    };

    const saveFile = (blob: Blob, fileName: string) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const sendFile = async (file: File) => {
        dataChannel.current = peerConnection.current!.createDataChannel("fileTransfer");
        setupDataChannel(dataChannel.current);

        dataChannel.current.onopen = () => {
            sendFileInChunks(file);
        };

        const offer = await peerConnection.current!.createOffer();
        await peerConnection.current!.setLocalDescription(offer);
        socketService.emit("sendOffer", { sdp: peerConnection.current!.localDescription, target: id });
        console.log("Offer sent to peer:", peerConnection.current!.localDescription);
    };

    const sendFileInChunks = (file: File) => {
        const reader = new FileReader();
        let offset = 0;

        const metadata = {
            fileName: file.name,
            fileSize: file.size,
        };

        dataChannel.current!.send(JSON.stringify(metadata));
        console.log("Sent file metadata:", metadata);

        reader.onload = () => {
            if (dataChannel.current!.readyState === "open") {
                const chunk = reader.result as ArrayBuffer;
                const sendChunk = () => {
                    try {
                        dataChannel.current!.send(chunk);
                        console.log("Chunk sent:", offset, chunk);

                        offset += chunk.byteLength;
                        if (offset < file.size) {
                            readSlice(offset);
                        } else {
                            console.log("All chunks sent");
                        }
                    } catch (e) {
                        if ((e as Error).name === "OperationError") {
                            setTimeout(sendChunk, 100);
                        }
                    }
                };
                sendChunk(); // Initial attempt to send chunk
            }
        };

        const readSlice = (o: number) => {
            const slice = file.slice(o, o + CHUNK_SIZE);
            reader.readAsArrayBuffer(slice);
        };

        readSlice(0);
    };

    const handleUploadFile = async (files: File[]) => {
        const fileData = files.map((file) => {
            const fileId = uuidv4();
            return {
                fileId,
                fileName: file.name,
                user: { id: socketService.socket!.id },
            };
        });

        const internalFileData = files.map((file, index) => ({
            fileId: fileData[index].fileId,
            file,
        }));

        setInternalFileList(internalFileData);

        const body = {
            files: fileData.map(({ fileId, fileName, user }) => ({
                fileId,
                fileName,
                user,
            })),
        };

        try {
            await apiService.post(`/rooms/${id}/upload`, body);
            // Notify other clients about the uploaded files
            refreshRoomStatus();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDownload = () => {
        if (selectedFile) {
            console.log("Selected file ID:", selectedFile);
            const file = internalFileList.find((file) => file.fileId === selectedFile);
            if (file) {
                console.log("Sending file:", file.file.name);
                sendFile(file.file);
            } else {
                console.log("Requesting file:", selectedFile);
                socketService.emit("requestFile", { fileId: selectedFile, requesterId: socketService.socket!.id });
            }
        } else {
            alert("No file selected for download.");
        }
    };

    return (
        <div>
            <h1 onClick={() => (window.location.href = "/")} style={{ cursor: "pointer" }}>
                File Share Page
            </h1>
            <h1>ID : {id}</h1>
            <Description />
            <ConnectedUser count={userCount} />
            <FileUploadComponent onUploadFile={handleUploadFile} />
            <div
                onClick={refreshRoomStatus}
                style={{
                    cursor: "pointer",
                    backgroundColor: "lightgray",
                    padding: 10,
                    borderRadius: 10,
                    width: 100,
                    textAlign: "center",
                    margin: 10,
                }}
            >
                파일 리프레시
            </div>
            <FileDownLoadComponent fileList={fileList} selectedFile={selectedFile} setSelectedFile={setSelectedFile} onDownload={handleDownload} />
            <h1>QR 코드로 공유하기</h1>
            <canvas id="roomCode" style={{ borderRadius: 20 }}></canvas>
            <CopyLink />
        </div>
    );
};

const ConnectedUser: React.FC<{ count: number }> = ({ count }) => {
    return <h1>Connected User : {count}</h1>;
};

const FileDownLoadComponent: React.FC<{
    fileList: FileData[];
    selectedFile: string | null;
    setSelectedFile: (fileId: string) => void;
    onDownload: () => void;
}> = ({ fileList, selectedFile, setSelectedFile, onDownload }) => {
    return (
        <div>
            {fileList.map((file, index) => (
                <div key={index}>
                    <input
                        type="radio"
                        id={`file-${index}`}
                        name="file"
                        value={file.fileId}
                        checked={selectedFile === file.fileId}
                        onChange={() => setSelectedFile(file.fileId)}
                    />
                    <label htmlFor={`file-${index}`}>{file.fileName}</label>
                </div>
            ))}
            <DownloadButton onClick={onDownload} />
        </div>
    );
};

export default FileSharePage;
