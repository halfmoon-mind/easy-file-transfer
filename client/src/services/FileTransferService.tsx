import socketService from "./socketService";

const CHUNK_SIZE = 16384;

class FileTransferService {
    private peerConnection: RTCPeerConnection;
    private dataChannel?: RTCDataChannel;
    private iceCandidateQueue: RTCIceCandidate[] = [];
    private receivedFileBuffers: { [key: string]: ArrayBuffer[] } = {};
    private currentFileMetadata: any = {};
    uploadedFiles: { [key: string]: File } = {};

    constructor() {
        this.peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        this.setupSignalingServer();
        this.setupPeerConnection();
    }

    private setupSignalingServer() {
        socketService.on("message", async (data: any) => {
            if (data.candidate) {
                if (this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
                    try {
                        await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                    } catch (e) {
                        console.error("Error adding received ICE candidate", e);
                    }
                } else {
                    this.iceCandidateQueue.push(data.candidate);
                }
            } else if (data.sdp) {
                try {
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                    while (this.iceCandidateQueue.length) {
                        const candidate = this.iceCandidateQueue.shift();
                        try {
                            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate!));
                        } catch (e) {
                            console.error("Error adding queued ICE candidate", e);
                        }
                    }
                    if (data.sdp.type === "offer") {
                        const answer = await this.peerConnection.createAnswer();
                        await this.peerConnection.setLocalDescription(answer);
                        socketService.emit("message", { sdp: this.peerConnection.localDescription });
                    }
                } catch (e) {
                    console.error("Error setting remote SDP", e);
                }
            }
        });

        socketService.on("uploadFile", (data: any) => {
            this.uploadedFiles[data.fileName] = data.file;
        });

        socketService.on("requestFile", async (data: any) => {
            const { fileName, requesterId } = data;
            const file = this.uploadedFiles[fileName];
            if (file) {
                this.dataChannel = this.peerConnection.createDataChannel("fileTransfer");
                this.setupDataChannel(this.dataChannel);

                this.dataChannel.onopen = () => {
                    this.sendFileInChunks(file);
                };

                const offer = await this.peerConnection.createOffer();
                await this.peerConnection.setLocalDescription(offer);
                socketService.emit("message", { sdp: this.peerConnection.localDescription, target: requesterId });
            } else {
                console.error("File not found:", fileName);
            }
        });
    }

    private setupPeerConnection() {
        this.peerConnection.onicecandidate = (event: any) => {
            if (event.candidate) {
                socketService.emit("message", { candidate: event.candidate });
            }
        };

        this.peerConnection.ondatachannel = (event: any) => {
            this.dataChannel = event.channel;
            if (this.dataChannel) {
                this.setupDataChannel(this.dataChannel);
            }
        };
    }

    private setupDataChannel(channel: RTCDataChannel) {
        channel.onopen = () => {
            console.log("Data channel is open");
        };

        channel.onclose = () => {
            console.log("Data channel is closed");
        };

        channel.onmessage = (event: any) => {
            const receivedData = event.data;

            if (typeof receivedData === "string") {
                const metadata = JSON.parse(receivedData);
                this.currentFileMetadata = metadata;
                this.receivedFileBuffers[metadata.fileName] = [];
            } else {
                const fileBuffer = this.receivedFileBuffers[this.currentFileMetadata.fileName];
                fileBuffer.push(receivedData);

                if (fileBuffer.reduce((acc, chunk) => acc + chunk.byteLength, 0) === this.currentFileMetadata.fileSize) {
                    const blob = new Blob(fileBuffer);
                    this.saveFile(blob, this.currentFileMetadata.fileName);
                }
            }
        };

        channel.onerror = (error: any) => {
            console.error("Data channel error:", error);
        };
    }

    private saveFile(blob: Blob, fileName: string) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    public async sendFile(file: File) {
        this.dataChannel = this.peerConnection.createDataChannel("fileTransfer");
        this.setupDataChannel(this.dataChannel);

        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        socketService.emit("message", { sdp: this.peerConnection.localDescription });

        this.dataChannel.onopen = () => {
            this.sendFileInChunks(file);
        };
    }

    private sendFileInChunks(file: Blob) {
        const reader = new FileReader();
        let offset = 0;

        const metadata = {
            fileName: (file as File).name,
            fileSize: file.size,
        };

        this.dataChannel!.send(JSON.stringify(metadata));

        reader.onload = () => {
            if (this.dataChannel!.readyState === "open") {
                const chunk = reader.result as ArrayBuffer;

                const sendChunk = () => {
                    try {
                        this.dataChannel!.send(chunk);
                        offset += chunk.byteLength;
                        if (offset < file.size) {
                            readSlice(offset);
                        } else {
                            console.log("All chunks sent");
                        }
                    } catch (e: any) {
                        if (e.name === "OperationError") {
                            setTimeout(sendChunk, 100);
                        }
                    }
                };

                sendChunk();
            }
        };

        const readSlice = (o: number) => {
            const slice = file.slice(o, o + CHUNK_SIZE);
            reader.readAsArrayBuffer(slice);
        };

        readSlice(0);
    }
}

export default FileTransferService;
