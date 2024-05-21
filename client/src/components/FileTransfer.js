// src/components/FileTransfer.js
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";

const FileTransfer = () => {
    const { id } = useParams();

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "/fileTransfer.js"; // 스크립트 파일 경로
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script); // 컴포넌트 언마운트 시 스크립트 제거
        };
    }, []);

    return (
        <div>
            <h1>ID : {id}</h1>
            <h1>File Transfer</h1>
            <input type="file" id="fileInput" />
            <button id="sendButton">Send File</button>
            <button id="downloadButton">Download File</button>
            <progress id="progressBar" value="0" max="100" style={{ display: "none" }}></progress>
            <div id="receivedFiles"></div>
        </div>
    );
};

export default FileTransfer;
