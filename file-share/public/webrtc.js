const signalingServer = io("http://43.201.24.121:8080");

// Initialize RTCPeerConnection
const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});

let dataChannel;
const CHUNK_SIZE = 16384; // 16KB 청크 크기 설정
let receivedFiles = []; // 수신된 파일을 저장하기 위한 배열
let receivedFileBuffers = {}; // 청크 단위로 수신된 파일 데이터를 저장하기 위한 객체
let currentFileMetadata = {}; // 수신 중인 파일의 메타데이터 저장 객체

// Handle ICE candidates
peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        signalingServer.emit("message", { candidate: event.candidate });
        console.log("ICE candidate sent:", event.candidate);
    } else {
        console.log("All ICE candidates have been sent");
    }
};

// Handle incoming signaling messages
signalingServer.on("message", async (data) => {
    if (data.candidate) {
        console.log("Received ICE candidate:", data.candidate);
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log("ICE candidate added successfully");
        } catch (e) {
            console.error("Error adding received ICE candidate", e);
        }
    } else if (data.sdp) {
        console.log("Received SDP:", data.sdp);
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            console.log("Remote SDP set successfully");
            if (data.sdp.type === "offer") {
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                signalingServer.emit("message", { sdp: peerConnection.localDescription });
                console.log("Answer sent:", peerConnection.localDescription);
            }
        } catch (e) {
            console.error("Error setting remote SDP", e);
        }
    }
});

signalingServer.on("connect", () => {
    console.log("Socket.io connection established");
    createConnection(); // Start the connection process once WebSocket is open
});

// Create data channel and handle file reception
peerConnection.ondatachannel = (event) => {
    console.log("Data channel received:", event.channel);
    dataChannel = event.channel;
    setupDataChannel(dataChannel);
};

const setupDataChannel = (channel) => {
    channel.onopen = () => {
        console.log("Data channel is open");
        document.getElementById("sendButton").disabled = false; // Enable send button when data channel is open
    };
    channel.onclose = () => {
        console.log("Data channel is closed");
        document.getElementById("sendButton").disabled = true; // Disable send button when data channel is closed
    };
    channel.onmessage = (event) => {
        const receivedData = event.data;

        if (typeof receivedData === "string") {
            const metadata = JSON.parse(receivedData);
            currentFileMetadata = metadata;
            receivedFileBuffers[metadata.fileName] = [];
            console.log("Received file metadata:", metadata);
        } else {
            const fileBuffer = receivedFileBuffers[currentFileMetadata.fileName];
            fileBuffer.push(receivedData);
            console.log(`Received chunk: ${fileBuffer.length}, size: ${receivedData.byteLength}`);

            if (fileBuffer.reduce((acc, chunk) => acc + chunk.byteLength, 0) === currentFileMetadata.fileSize) {
                const blob = new Blob(fileBuffer);
                const fileName = currentFileMetadata.fileName;
                receivedFiles.push({ name: fileName, blob: blob });
                delete receivedFileBuffers[fileName];
                updateReceivedFilesList();
                console.log("File received completely:", fileName);
            }
        }
    };
    channel.onerror = (error) => {
        console.error("Data channel error:", error);
    };
};

const updateReceivedFilesList = () => {
    const receivedFilesContainer = document.getElementById("receivedFiles");
    receivedFilesContainer.innerHTML = ""; // Clear the container

    receivedFiles.forEach((file, index) => {
        const radioInput = document.createElement("input");
        radioInput.type = "radio";
        radioInput.name = "receivedFile";
        radioInput.value = file.name;
        radioInput.id = `file${index}`;

        const label = document.createElement("label");
        label.htmlFor = `file${index}`;
        label.textContent = file.name;

        const br = document.createElement("br");

        receivedFilesContainer.appendChild(radioInput);
        receivedFilesContainer.appendChild(label);
        receivedFilesContainer.appendChild(br);
    });
};

const sendFileInChunks = (file) => {
    const reader = new FileReader();
    let offset = 0;

    const metadata = {
        fileName: file.name,
        fileSize: file.size,
    };

    dataChannel.send(JSON.stringify(metadata));
    console.log("Sent file metadata:", metadata);

    reader.onload = () => {
        if (dataChannel.readyState === "open") {
            const chunk = reader.result;
            dataChannel.send(chunk);
            console.log("Chunk sent:", offset, chunk);

            offset += chunk.byteLength;
            if (offset < file.size) {
                readSlice(offset);
            } else {
                console.log("All chunks sent");
            }
        }
    };

    const readSlice = (o) => {
        const slice = file.slice(o, o + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
    };

    readSlice(0);
};

// Handle file sending
document.getElementById("sendButton").onclick = () => {
    const file = document.getElementById("fileInput").files[0];
    if (file && dataChannel && dataChannel.readyState === "open") {
        sendFileInChunks(file);
        console.log("File sent:", file.name);
    } else {
        alert("No file selected or data channel is not established.");
    }
};

// Handle file download
document.getElementById("downloadButton").onclick = () => {
    const selectedRadio = document.querySelector('input[name="receivedFile"]:checked');
    if (selectedRadio) {
        const selectedFileName = selectedRadio.value;
        const fileToDownload = receivedFiles.find((file) => file.name === selectedFileName);
        if (fileToDownload) {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(fileToDownload.blob);
            link.download = fileToDownload.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert("File not found.");
        }
    } else {
        alert("No file selected for download.");
    }
};

// Create data channel and offer
const createConnection = async () => {
    dataChannel = peerConnection.createDataChannel("fileTransfer");
    setupDataChannel(dataChannel);

    dataChannel.onopen = () => {
        console.log("Data channel (initiator) is open");
        document.getElementById("sendButton").disabled = false;
    };

    dataChannel.onclose = () => {
        console.log("Data channel (initiator) is closed");
        document.getElementById("sendButton").disabled = true;
    };

    dataChannel.onmessage = (event) => {
        const receivedData = event.data;

        if (typeof receivedData === "string") {
            const metadata = JSON.parse(receivedData);
            currentFileMetadata = metadata;
            receivedFileBuffers[metadata.fileName] = [];
            console.log("Received file metadata:", metadata);
        } else {
            const fileBuffer = receivedFileBuffers[currentFileMetadata.fileName];
            fileBuffer.push(receivedData);
            console.log(`Received chunk: ${fileBuffer.length}, size: ${receivedData.byteLength}`);

            if (fileBuffer.reduce((acc, chunk) => acc + chunk.byteLength, 0) === currentFileMetadata.fileSize) {
                const blob = new Blob(fileBuffer);
                const fileName = currentFileMetadata.fileName;
                receivedFiles.push({ name: fileName, blob: blob });
                delete receivedFileBuffers[fileName];
                updateReceivedFilesList();
                console.log("File received completely:", fileName);
            }
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    signalingServer.emit("message", { sdp: peerConnection.localDescription });
    console.log("Offer sent:", peerConnection.localDescription);
};

// Initially disable the send button
document.getElementById("sendButton").disabled = true;
