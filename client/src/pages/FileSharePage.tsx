import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Description from "../components/Description";
import QRCode from "qrcode";
import { FileUploader } from "react-drag-drop-files";
import CopyLink from "../components/FileShare/CopyLink";
import DownloadButton from "../components/DownloadButton";
import socketService from "../services/socketService";
import apiService from "../services/apiService";
import { FileData, Room } from "../types/Room";
import { v4 } from "uuid";

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

const FileSharePage = () => {
    const { id } = useParams();
    const [fileList, setFileList] = useState<FileData[]>([]);
    const [userCount, setUserCount] = useState(0);
    const [internalFileList, setInternalFileList] = useState<File[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

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
            console.log("DATA", data);
        });

        return () => {
            socketService.disconnect(id);
        };
    }, [id]);

    const handleUploadFile = async (files: File[]) => {
        setInternalFileList(files);

        const body = {
            files: files.map((file) => {
                return {
                    fileId: v4(),
                    fileName: file.name,
                    user: { id: socketService.socket!.id },
                };
            }),
        };

        try {
            await apiService.post(`/rooms/${id}/upload`, body);
        } catch (error) {
            console.error(error);
        }
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
            <Description />
            <ConnectedUser count={userCount} />
            <FileUploadComponent
                onUploadFile={(files: File[]) => {
                    handleUploadFile(files);
                }}
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
            <FileDownLoadComponent fileList={fileList} selectedFile={selectedFile} setSelectedFile={setSelectedFile} />

            <h1>QR 코드로 공유하기</h1>
            <canvas id="roomCode" style={{ borderRadius: 20 }}></canvas>
            <CopyLink />
        </div>
    );
};

const ConnectedUser = ({ count }: { count: number }) => {
    return <h1>Connected User : {count}</h1>;
};

const FileDownLoadComponent = ({
    fileList,
    selectedFile,
    setSelectedFile,
}: {
    fileList: FileData[];
    selectedFile: string | null;
    setSelectedFile: (fileId: string) => void;
}) => {
    const handleDownLoad = () => {
        console.log("Selected file:", selectedFile);
    };

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
            <DownloadButton onClick={handleDownLoad} />
        </div>
    );
};

export default FileSharePage;
