import io from "socket.io-client";

const signalingServer = io("https://easyfile.site:8080");

const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});

let dataChannel;
const CHUNK_SIZE = 16384;
let receivedFileBuffers = {};
let currentFileMetadata = {};
let uploadedFiles = {};
let progressBar = document.getElementById("progressBar");
let iceCandidateQueue = [];

signalingServer.on("connect", () => {
    const userId = signalingServer.id;
    signalingServer.emit("register", { id: userId });
    console.log("Registered with ID:", userId);
});

peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        signalingServer.emit("message", { candidate: event.candidate });
        console.log("ICE candidate sent:", event.candidate);
    } else {
        console.log("All ICE candidates have been sent");
    }
};

signalingServer.on("message", async (data) => {
    if (data.candidate) {
        console.log("Received ICE candidate:", data.candidate);
        if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log("ICE candidate added successfully");
            } catch (e) {
                console.error("Error adding received ICE candidate", e);
            }
        } else {
            iceCandidateQueue.push(data.candidate);
        }
    } else if (data.sdp) {
        console.log("Received SDP:", data.sdp);
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            console.log("Remote SDP set successfully");
            while (iceCandidateQueue.length) {
                const candidate = iceCandidateQueue.shift();
                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log("Queued ICE candidate added successfully");
                } catch (e) {
                    console.error("Error adding queued ICE candidate", e);
                }
            }
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

peerConnection.ondatachannel = (event) => {
    console.log("Data channel received:", event.channel);
    dataChannel = event.channel;
    setupDataChannel(dataChannel);
};

const setupDataChannel = (channel) => {
    channel.onopen = () => {
        console.log("Data channel is open");
        document.getElementById("sendButton").disabled = false;
    };
    channel.onclose = () => {
        console.log("Data channel is closed");
        document.getElementById("sendButton").disabled = true;
    };
    channel.onmessage = (event) => {
        const receivedData = event.data;

        if (typeof receivedData === "string") {
            const metadata = JSON.parse(receivedData);
            currentFileMetadata = metadata;
            receivedFileBuffers[metadata.fileName] = [];
            progressBar.value = 0;
            progressBar.max = metadata.fileSize;
            progressBar.style.display = "block";
        } else {
            const fileBuffer = receivedFileBuffers[currentFileMetadata.fileName];
            fileBuffer.push(receivedData);
            progressBar.value += receivedData.byteLength;
            console.log(`Received chunk: ${fileBuffer.length}, size: ${receivedData.byteLength}`);

            if (fileBuffer.reduce((acc, chunk) => acc + chunk.byteLength, 0) === currentFileMetadata.fileSize) {
                const blob = new Blob(fileBuffer);
                const fileName = document.querySelector('input[name="receivedFile"]:checked').value;
                saveFile(blob, fileName);
                console.log("File received completely:", fileName);
                progressBar.style.display = "none";
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

document.getElementById("fileInput").onchange = () => {
    document.getElementById("sendButton").disabled = false;
};

document.getElementById("sendButton").onclick = () => {
    const file = document.getElementById("fileInput").files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const fileData = event.target.result;
            signalingServer.emit("uploadFile", { fileName: file.name, uploaderId: signalingServer.id });
            console.log("File name uploaded:", file.name);
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert("No file selected.");
    }
};

document.getElementById("downloadButton").onclick = () => {
    const selectedRadio = document.querySelector('input[name="receivedFile"]:checked');
    if (selectedRadio) {
        const selectedFileName = selectedRadio.value;
        const uploaderId = uploadedFiles[selectedFileName];
        if (uploaderId) {
            signalingServer.emit("requestFile", {
                fileName: selectedFileName,
                requesterId: signalingServer.id,
                uploaderId: uploaderId,
            });
        } else {
            alert("File not found.");
        }
    } else {
        alert("No file selected for download.");
    }
};

signalingServer.on("uploadFile", (data) => {
    uploadedFiles[data.fileName] = data.uploaderId;
    updateUploadedFilesList();
});

const updateUploadedFilesList = () => {
    const receivedFilesContainer = document.getElementById("receivedFiles");
    receivedFilesContainer.innerHTML = "";

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

signalingServer.on("requestFile", async (data) => {
    const { fileName, requesterId, uploaderId } = data;

    if (signalingServer.id === uploaderId) {
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
});

document.getElementById("sendButton").disabled = true;

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

            const sendChunk = () => {
                try {
                    dataChannel.send(chunk);
                    console.log("Chunk sent:", offset, chunk);

                    offset += chunk.byteLength;
                    if (offset < file.size) {
                        readSlice(offset);
                    } else {
                        console.log("All chunks sent");
                    }
                } catch (e) {
                    if (e.name === "OperationError") {
                        setTimeout(sendChunk, 100);
                    }
                }
            };

            sendChunk(); // Initial attempt to send chunk
        }
    };

    const readSlice = (o) => {
        const slice = file.slice(o, o + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
    };

    readSlice(0);
};
