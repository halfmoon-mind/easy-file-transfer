import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import Description from "../components/Description";
import DownloadButton from "../components/DownloadButton";
import QRCode from "qrcode";

const FileSharePage = () => {
    const { id } = useParams();
    const queryParameters = new URLSearchParams(useLocation().search);
    const name = queryParameters.get("name");
    const [isHosting, setHosting] = useState(false);

    useEffect(() => {
        if (!name) {
            const fileName = Math.random().toString(36).substring(7);
            window.location.href = `/file/${id}?name=${fileName}`;
        }
        const canvas = document.getElementById("roomCode");
        // black
        QRCode.toCanvas(canvas, window.location.href, { color: { dark: "#000000" }, scale: 4, small: true });
    }, [id, name]);

    useEffect(() => {
        const updateHostingStatus = () => {
            setHosting(Math.random() < 0.5);
        };
        updateHostingStatus();
    }, [id]);

    const handleDownloadClick = () => {
        console.log("Download button clicked");
        // get random true or false
        setHosting(Math.random() < 0.5);
    };

    return (
        <div>
            <h1>File Share Page</h1>
            <h1>ID : {id}</h1>
            <h1>File Name : {name}</h1>
            <DownloadButton id={id} onClick={handleDownloadClick} />
            <Description />

            {isHosting ? (
                <div>
                    <h2>File Transfer</h2>
                    <input type="file" id="fileInput" />
                    <button id="sendButton">Send File</button>
                    <button id="downloadButton">Download File</button>
                    <progress id="progressBar" value="0" max="100" style={{ display: "none" }}></progress>
                    <div id="receivedFiles"></div>
                </div>
            ) : (
                <div>
                    <h2>File Transfer</h2>
                    <p>File transfer is not available</p>
                </div>
            )}
            <div id="qrcode"></div>
            <canvas id="roomCode" style={{ borderRadius: 20 }}></canvas>
            <h2
                style={{ cursor: "pointer" }}
                onClick={() => {
                    window.location.href = "/";
                }}
            >
                GET BACK
            </h2>
        </div>
    );
};

export default FileSharePage;
