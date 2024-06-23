import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import QRCode from "qrcode";
import socketService from "src/services/SocketService";
import { FileUploader } from "react-drag-drop-files";
import { FileData, Room } from "src/types/Room";
import SocketFormat from "src/types/SocketFormat";
import { v4 as uuidv4 } from "uuid";

const CHUNK_SIZE = 16384;

const SharePage = () => {
    const { id } = useParams<{ id: string }>();
    const [room, setRoom] = useState<Room | null>(null);

    const peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
        ],
    });

    const dataChannel = peerConnection.createDataChannel("fileTransfer");
    dataChannel.onerror = (error) => {
        console.error("Data Channel Error:", error);
    };
    dataChannel.onclose = () => {
        console.log("Data Channel closed");
    };
    dataChannel.onopen = () => {
        console.log("Data Channel opened");
    };

    useEffect(() => {
        validateRoomId(id);
        setQRCode();
        setSocketSetting(id!);
    }, [id]);

    return (
        <div>
            id: {id}
            <hr />
            <canvas id="roomCode" />
            <hr />
            <div>
                Users :{" "}
                {room?.users.map((user) => (
                    <div key={user}>{user}</div>
                ))}
            </div>
            <hr />
            <div>
                Files :{" "}
                {room?.files.map((file) => (
                    // onDownloadFile
                    // <div key={file.id}>{file.name}</div>
                    <div key={file.id} onClick={() => onDownloadFile(file)}>
                        {file.name}
                    </div>
                ))}
            </div>
            <hr />
            <FileUploader
                name="file"
                multiple={true}
                label="UPLOAD HERE"
                onDrop={(e: File[]) => {
                    const files = Array.from(e).map((file) => {
                        const fileId = uuidv4();
                        return {
                            id: fileId,
                            name: file.name,
                            user: socketService.socket?.id!,
                            file: file,
                        };
                    });
                    onUploadFile(files);
                }}
                onSelect={(e: File[]) => {
                    const files = Array.from(e).map((file) => {
                        const fileId = uuidv4();
                        return {
                            id: fileId,
                            name: file.name,
                            user: socketService.socket?.id!,
                            file: file,
                        };
                    });
                    onUploadFile(files);
                }}
            />
        </div>
    );

    function onDownloadFile(file: FileData) {
        const targetFile = room?.files.find((f) => f.id === file.id);
        if (!targetFile) {
            return;
        }
        sendOffer(targetFile.user);
        gatherICECandidates();
        peerConnection.ondatachannel = (event) => {
            const receiveChannel = event.channel;
            receiveChannel.onmessage = (event) => {
                const data = event.data;
                console.log("Data received: ", data);
            };
        };
    }

    function onUploadFile(files: FileData[]) {
        const sendingData: SocketFormat = {
            sender: socketService.socket?.id!,
            receiver: id!,
            data: files,
        };
        socketService.emit("uploadFile", sendingData);
    }

    function setSocketSetting(id: string): void {
        socketService.connect(id);
        socketService.on("roomStatus", (data: Room) => setRoom(data));
        handleOffer();
        handleAnswer();
        handleICECandidate();
    }

    async function sendOffer(target: string) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socketService.emit("offer", { target: target, data: offer });
    }

    async function handleOffer() {
        socketService.on("offer", async (data) => {
            await peerConnection.setRemoteDescription(data);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socketService.emit("answer", { target: "answer", data: answer });
        });
    }

    async function handleAnswer() {
        socketService.on("answer", async (data) => {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
        });
    }

    function gatherICECandidates() {
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socketService.emit("iceCandidate", { type: "candidate", candidate: event.candidate });
            }
        };
    }

    async function handleICECandidate() {
        socketService.on("iceCandidate", async (data) => {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data));
            peerConnection.ondatachannel = (event) => {
                const receiveChannel = event.channel;
                receiveChannel.onmessage = (event) => {
                    const data = event.data;
                    console.log("Data received: ", data);
                };
            };
        });
    }
};

function setQRCode(): void {
    const canvas = document.getElementById("roomCode");
    QRCode.toCanvas(canvas, window.location.href, { color: { dark: "#000000" }, scale: 4 });
}

function validateRoomId(id: string | undefined): void {
    if (!id || id.length !== 6) {
        alert("방 ID는 6자리여야 합니다. 다시 시도해주세요.");
        window.location.href = "/";
    }
}

export default SharePage;
