import React, { useEffect, useState } from "react";
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
                FileTransferService.sendFile(file.file);
            } else {
                console.error("File not found in internal list:", fileId);
            }
        });

        return () => {
            socketService.disconnect(id);
        };
    }, [id, internalFileList]);

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
            fileData.forEach(({ fileId, fileName }) => {
                socketService.emit("uploadFile", { fileId, fileName });
            });
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
                FileTransferService.sendFile(file.file);
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
