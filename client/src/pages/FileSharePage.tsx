import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Description from "../components/Description";
import QRCode from "qrcode";
import { FileUploader } from "react-drag-drop-files";
import CopyLink from "../components/FileShare/CopyLink";
import apiService, { SOCKET_BASE_URL } from "../services/apiService";
import { io } from "socket.io-client";

const FileUploadComponent = ({ fileList, setFileList }: { fileList: File[]; setFileList: (fileList: File[]) => void }) => {
    return (
        <div>
            <FileUploader
                name="file"
                multiple={true}
                label="UPLOAD HERE"
                onDrop={(files: File[]) => {
                    setFileList([...fileList, ...files]);
                }}
                onSelect={(files: File[]) => {
                    setFileList([...fileList, ...files]);
                }}
            />
        </div>
    );
};

const FileSharePage = () => {
    const navigator = useNavigate();
    const { id } = useParams();
    const [fileList, setFileList] = useState<File[]>([]);
    const [userCount, setUserCount] = useState(0);

    useEffect(() => {
        const canvas = document.getElementById("roomCode");
        QRCode.toCanvas(canvas, window.location.href, { color: { dark: "#000000" }, scale: 4 });

        const script = document.createElement("script");
        script.src = "https://cdn.socket.io/4.0.0/socket.io.min.js";
        script.async = true;
        document.body.appendChild(script);

        const socket = io(SOCKET_BASE_URL);
        socket.on("connect", () => {
            console.log("Connected to socket server");
            socket.emit("joinRoom", id);
        });

        socket.on("roomStatus", (status: string) => {
            console.log(status);
        });

        return () => {
            socket.disconnect();
            console.log("Disconnected from socket server");
        };
    }, [id]);

    if (!id || id.length !== 6) {
        alert("방 ID 길이는 6자리여야 합니다.");
        window.location.href = "/";
        return null;
    }

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
            <FileUploadComponent fileList={fileList} setFileList={setFileList} />
            <FileDownLoadComponent fileList={fileList} />

            <h1>QR 코드로 공유하기</h1>
            <canvas id="roomCode" style={{ borderRadius: 20 }}></canvas>
            <CopyLink />
        </div>
    );
};

const ConnectedUser = ({ count }: { count: number }) => {
    return <h1>Connected User : {count}</h1>;
};

const FileDownLoadComponent = ({ fileList }: { fileList: File[] }) => {
    return (
        <div>
            {fileList.map((file, index) => {
                return (
                    <div key={index}>
                        <a href={URL.createObjectURL(file)} download={file.name}>
                            {file.name}
                        </a>
                    </div>
                );
            })}
        </div>
    );
};

export default FileSharePage;
