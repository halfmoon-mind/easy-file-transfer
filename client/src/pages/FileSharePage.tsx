import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Description from "../components/Description";
import { FileUploader } from "react-drag-drop-files";
import CopyLink from "../components/FileShare/CopyLink";
import DownloadButton from "../components/DownloadButton";
import socketService from "../services/socketService";
import apiService from "../services/apiService";
import { FileData, Room } from "../types/Room";
import { v4 as uuidv4 } from "uuid";
import FileTransferService from "../services/FileTransferService";

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

        socketService.connect(id);

        socketService.on("roomStatus", (data) => {
            handleRefreshRoomStatus(data);
        });

        return () => {
            socketService.disconnect(id);
        };
    }, [id]);

    const handleUploadFile = async (files: File[]) => {
        setInternalFileList(files);

        const body = {
            files: files.map((file) => ({
                fileId: uuidv4(),
                fileName: file.name,
                user: { id: socketService.socket!.id },
            })),
        };

        try {
            await apiService.post(`/rooms/${id}/upload`, body);
            // Notify other clients about the uploaded files
            files.forEach((file) => {
                socketService.emit("uploadFile", { fileName: file.name, file });
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleDownload = () => {
        if (selectedFile) {
            const file = internalFileList.find((file) => file.name === selectedFile);
            if (file) {
                const fileTransferService = new FileTransferService();
                fileTransferService.sendFile(file);
            } else {
                alert("File not found.");
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
