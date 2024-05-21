import { io } from "socket.io-client";

export const setupWebRTC = () => {
    // WebRTC initialization logic
    const socket = io("https://easyfile.site:8080");
    socket.on("connect", () => {
        console.log("Connected to the socket server");
    });

    // Additional setup logic...
};

export const sendFile = (file, setProgress) => {
    // File sending logic using WebRTC
    const reader = new FileReader();
    reader.onload = (e) => {
        const buffer = e.target.result;
        // Send buffer via WebRTC
        setProgress(100); // Update progress as needed
    };
    reader.readAsArrayBuffer(file);
};

export const receiveFile = () => {
    // File receiving logic using WebRTC
    console.log("Download clicked");
};

export const handleFileChange = () => {
    console.log("FILE CHANGED");
};
