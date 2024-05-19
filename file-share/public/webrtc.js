const signalingServer = io("https://daitssu.com:8080");

// IndexedDB 관련 설정
let db;
const request = indexedDB.open("fileTransferDB", 1);

request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "fileName" });
    }
};

request.onsuccess = (event) => {
    db = event.target.result;
    console.log("IndexedDB initialized");
};

request.onerror = (event) => {
    console.error("IndexedDB error:", event.target.errorCode);
};

// Initialize RTCPeerConnection with ICE servers
const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});

let dataChannel;
const CHUNK_SIZE = 16384; // 16KB chunk size
let receivedFiles = []; // Array to store received files
let receivedFileBuffers = {}; // Object to store received file chunks
let currentFileMetadata = {}; // Object to store metadata of the current receiving file

// Store registered users and files
let registeredUsers = {};
let uploadedFiles = {};

// Register user on connection
signalingServer.on("connect", () => {
    const userId = signalingServer.id;
    signalingServer.emit("register", { id: userId });
    console.log("Registered with ID:", userId);
});

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
                saveFile(blob, fileName);
                console.log("File received completely:", fileName);
            }
        }
    };
    channel.onerror = (error) => {
        console.error("Data channel error:", error);
    };
};

const saveFile = (blob, fileName) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

const storeFileInDB = (fileName, fileData) => {
    const transaction = db.transaction(["files"], "readwrite");
    const store = transaction.objectStore("files");
    const fileRecord = { fileName, fileData };

    store.put(fileRecord);
    transaction.oncomplete = () => {
        console.log("File stored in DB:", fileName);
    };
    transaction.onerror = (event) => {
        console.error("Error storing file in DB:", event.target.errorCode);
    };
};

// Handle file upload
document.getElementById("fileInput").onchange = () => {
    document.getElementById("sendButton").disabled = false;
};

document.getElementById("sendButton").onclick = () => {
    const file = document.getElementById("fileInput").files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const fileData = event.target.result;
            storeFileInDB(file.name, fileData);
            signalingServer.emit("uploadFile", { fileName: file.name, uploaderId: signalingServer.id });
            console.log("File name uploaded:", file.name);
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert("No file selected.");
    }
};

// Handle file download
document.getElementById("downloadButton").onclick = () => {
    const selectedRadio = document.querySelector('input[name="receivedFile"]:checked');
    if (selectedRadio) {
        const selectedFileName = selectedRadio.value;
        const uploaderId = uploadedFiles[selectedFileName];
        if (uploaderId) {
            signalingServer.emit("requestFile", { fileName: selectedFileName, requesterId: signalingServer.id, uploaderId: uploaderId });
        } else {
            alert("File not found.");
        }
    } else {
        alert("No file selected for download.");
    }
};

// Handle uploadFile event to update file list
signalingServer.on("uploadFile", (data) => {
    uploadedFiles[data.fileName] = data.uploaderId;
    updateUploadedFilesList();
});

const updateUploadedFilesList = () => {
    const receivedFilesContainer = document.getElementById("receivedFiles");
    receivedFilesContainer.innerHTML = ""; // Clear the container

    Object.keys(uploadedFiles).forEach((fileName, index) => {
        const radioInput = document.createElement("input");
        radioInput.type = "radio";
        radioInput.name = "receivedFile";
        radioInput.value = fileName;
        radioInput.id = `file${index}`;

        const label = document.createElement("label");
        label.htmlFor = `file${index}`;
        label.textContent = fileName;

        const br = document.createElement("br");

        receivedFilesContainer.appendChild(radioInput);
        receivedFilesContainer.appendChild(label);
        receivedFilesContainer.appendChild(br);
    });
};

// Handle requestFile event to establish P2P connection and send file
signalingServer.on("requestFile", async (data) => {
    const { fileName, requesterId, uploaderId } = data;

    if (signalingServer.id === uploaderId) {
        // Retrieve file from IndexedDB
        const transaction = db.transaction(["files"], "readonly");
        const store = transaction.objectStore("files");
        const request = store.get(fileName);

        request.onsuccess = async (event) => {
            const fileRecord = event.target.result;
            if (fileRecord) {
                // Create data channel and connection for uploader
                dataChannel = peerConnection.createDataChannel("fileTransfer");
                setupDataChannel(dataChannel);

                dataChannel.onopen = () => {
                    sendFileInChunks(new Blob([fileRecord.fileData]));
                };

                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                signalingServer.emit("message", { sdp: peerConnection.localDescription, target: requesterId });
                console.log("Offer sent to requester:", peerConnection.localDescription);
            } else {
                console.error("File not found in DB:", fileName);
            }
        };

        request.onerror = (event) => {
            console.error("Error retrieving file from DB:", event.target.errorCode);
        };
    }
});

signalingServer.on("message", async (data) => {
    if (data.target && data.target === signalingServer.id) {
        if (data.sdp) {
            console.log("Received SDP:", data.sdp);
            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                console.log("Remote SDP set successfully");
                if (data.sdp.type === "offer") {
                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);
                    signalingServer.emit("message", { sdp: peerConnection.localDescription, target: data.sender });
                    console.log("Answer sent to uploader:", peerConnection.localDescription);
                }
            } catch (e) {
                console.error("Error setting remote SDP", e);
            }
        }
    }
});

// Initially disable the send button
document.getElementById("sendButton").disabled = true;

// Function to send file in chunks
const sendFileInChunks = (file) => {
    const reader = new FileReader();
    let offset = 0;

    const metadata = {
        fileName: file.name,
        fileSize: file.size,
    };

    // Send file metadata first
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
