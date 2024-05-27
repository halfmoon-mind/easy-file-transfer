import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Description from "../components/Description";
import DownloadButton from "../components/DownloadButton";
import "react-dropzone-uploader/dist/styles.css";
import QRCode from "qrcode";
import Dropzone from "react-dropzone-uploader";

const Standard = () => {
    const getUploadParams = () => {
        return { url: "http://localhost:8080/rooms/asdasd/upload-file" };
    };

    const handleChangeStatus = ({ meta }, status) => {
        console.log(status, meta);
    };

    const handleSubmit = (files, allFiles) => {
        console.log(files.map((f) => f.meta));
        allFiles.forEach((f) => f.remove());
    };

    return (
        <Dropzone
            getUploadParams={getUploadParams}
            onChangeStatus={handleChangeStatus}
            onSubmit={handleSubmit}
            styles={{ dropzone: { minHeight: 200, maxHeight: 250 } }}
            inputLabel="DRAG FILE TO UPLOAD"
        />
    );
};

const FileSharePage = () => {
    const { id } = useParams();
    const [isHosting, setHosting] = useState(false);

    useEffect(() => {
        // set QR code
        const canvas = document.getElementById("roomCode");
        QRCode.toCanvas(canvas, window.location.href, { color: { dark: "#000000" }, scale: 4, small: true });

        const script = document.createElement("script");
        script.src = "https://cdn.socket.io/4.0.0/socket.io.min.js";
        script.async = true;
        document.body.appendChild(script);
    }, [id]);

    useEffect(() => {
        const updateHostingStatus = () => {
            setHosting(Math.random() < 0.5);
        };
        updateHostingStatus();
    }, [id]);

    const handleDownloadClick = () => {
        console.log("Download button clicked");
        setHosting(Math.random() < 0.5);
    };

    return (
        <div>
            <h1>File Share Page</h1>
            <h1>ID : {id}</h1>
            {/* <DownloadButton id={id} onClick={handleDownloadClick} /> */}
            <Description />
            <Standard />

            {/* {isHosting ? (
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
            )} */}
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
