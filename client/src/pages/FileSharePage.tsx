import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";
import { FileUploader } from "react-drag-drop-files";
import CopyLink from "../components/FileShare/CopyLink";
import DownloadButton from "../components/DownloadButton";
import socketService from "../services/socketService";
import apiService from "../services/apiService";
import { FileData, Room } from "@/types/Room";

const FileSharePage = () => {
    const { id } = useParams();
    const [fileList, setFileList] = useState<FileData[]>([]);
    const [userCount, setUserCount] = useState(0);
    const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
    const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
    const fileInputRef = useRef(null);

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

        const canvas = document.getElementById("roomCode");
        QRCode.toCanvas(canvas, window.location.href, { color: { dark: "#000000" }, scale: 4 });

        const adapterScript = document.createElement("script");
        adapterScript.src = "https://webrtc.github.io/adapter/adapter-latest.js";
        adapterScript.async = true;
        document.body.appendChild(adapterScript);

        const socketScript = document.createElement("script");
        socketScript.src = "https://cdn.socket.io/4.0.0/socket.io.min.js";
        socketScript.async = true;
        document.body.appendChild(socketScript);

        socketService.connect(id);

        socketService.on("roomStatus", (data) => {
            handleRefreshRoomStatus(data);
        });

        socketService.on("offer", async (offer) => {
            const peerConnection = new RTCPeerConnection();
            setPeerConnection(peerConnection);

            peerConnection.ondatachannel = (event) => {
                const receiveChannel = event.channel;
                receiveChannel.onmessage = (event) => {
                    console.log("File received: ", event.data);
                    // 여기서 파일을 처리하는 로직을 추가합니다.
                };
                setDataChannel(receiveChannel);
            };

            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socketService.emit("answer", { answer, roomId: id });
        });

        socketService.on("answer", async (answer) => {
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        return () => {
            socketService.disconnect(id);
        };
    }, [id]);

    const handleFileUpload = async (files: File[]) => {
        const formData = new FormData();
        formData.append("file", files[0]);
        await apiService.post(`/rooms/${id}/upload`, formData);
        refreshRoomStatus();
    };

    const handleFileDownload = async (file: FileData) => {
        const peerConnection = new RTCPeerConnection();
        setPeerConnection(peerConnection);

        const dataChannel = peerConnection.createDataChannel("fileTransfer");
        setDataChannel(dataChannel);

        dataChannel.onopen = () => {
            console.log("Data channel opened");
            // P2P 파일 전송 로직을 여기에 추가합니다.
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socketService.emit("offer", { offer, roomId: id });
    };

    return (
        <div>
            <h1
                style={{ cursor: "pointer" }}
                onClick={() => {
                    window.location.href = "/";
                }}
            >
                File Share Page
            </h1>
            <h1>ID : {id}</h1>
            <ConnectedUser count={userCount} />
            <FileUploader
                ref={fileInputRef}
                name="file"
                multiple={true}
                label="UPLOAD HERE"
                onDrop={(files: File[]) => handleFileUpload(files)}
                onSelect={(files: File[]) => handleFileUpload(files)}
            />
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
            <FileDownLoadComponent fileList={fileList} onDownload={handleFileDownload} />
            <h1>QR 코드로 공유하기</h1>
            <canvas id="roomCode" style={{ borderRadius: 20 }}></canvas>
            <CopyLink />
        </div>
    );
};

const ConnectedUser = ({ count }: { count: number }) => {
    return <h1>Connected User : {count}</h1>;
};

const FileDownLoadComponent = ({ fileList, onDownload }: { fileList: FileData[]; onDownload: (file: FileData) => void }) => {
    return (
        <div>
            {fileList.map((file, index) => {
                return (
                    <div key={index}>
                        <span>{file.file.name}</span>
                        <DownloadButton onClick={() => onDownload(file)} />
                    </div>
                );
            })}
        </div>
    );
};

export default FileSharePage;
