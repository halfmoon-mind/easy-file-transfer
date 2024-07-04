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
  const [recenltyRequestedFile, setRecenltyRequestedFile] = useState<FileData | null>(null);

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
    socketService.emit("requestFile", file);
    if (targetFile.user === socketService.socket?.id!) {
      const url = URL.createObjectURL(targetFile.file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
    sendOffer(targetFile.user);

    peerConnection.ondatachannel = (event) => {
      const receiveChannel = event.channel;
      const receivedBuffers: ArrayBuffer[] = [];

      receiveChannel.onmessage = (event) => {
        const data = event.data;
        if (data === "EOF") {
          const receivedBlob = new Blob(receivedBuffers);
          const downloadUrl = URL.createObjectURL(receivedBlob);
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = targetFile.name;
          document.body.appendChild(a);
          a.click();
          URL.revokeObjectURL(downloadUrl);
          document.body.removeChild(a);
          console.log("File received and ready for download.");
        } else {
          receivedBuffers.push(data);
        }
      };

      receiveChannel.onopen = () => {
        console.log("Data channel is open and ready to receive file.");
      };

      receiveChannel.onclose = () => {
        console.log("Data channel is closed");
      };

      receiveChannel.onerror = (error) => {
        console.error("Receive channel error:", error);
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

  async function sendFile(file: File) {
    const fileReader = new FileReader();
    let offset = 0;

    fileReader.onload = (event: ProgressEvent<FileReader>) => {
      const result = event.target?.result;
      if (result instanceof ArrayBuffer) {
        dataChannel.send(result);
        offset += result.byteLength;
        if (offset < file.size) {
          readSlice(offset);
        } else {
          dataChannel.send("EOF");
          console.log("File transfer complete.");
        }
      }
    };

    const readSlice = (o: number) => {
      const slice = file.slice(o, o + CHUNK_SIZE);
      fileReader.readAsArrayBuffer(slice);
    };

    readSlice(0);
  }

  function setSocketSetting(id: string): void {
    socketService.connect(id);
    socketService.on("roomStatus", (data: Room) => {
      data.files = data.files.map((file) => ({
        ...file,
        file: new File([file.file], file.name, { type: file.file.type }),
      }));
      setRoom(data);
    });
    handleOffer();
    handleAnswer();
    gatherICECandidates();
    handleICECandidate();
    handleRequestFile();

    dataChannel.onopen = () => {
      console.log("Data channel is open and ready for file transfer.");
      if (recenltyRequestedFile) {
        sendFile(recenltyRequestedFile.file);
      }
    };

    dataChannel.onerror = (error) => {
      console.error("Data Channel Error:", error);
    };

    dataChannel.onclose = () => {
      console.log("Data Channel closed");
    };
  }

  function handleRequestFile() {
    socketService.on("requestFile", (data: SocketFormat) => {
      const fileData = data.data as FileData;
      const file = new File([fileData.file], fileData.name, { type: fileData.file.type });
      setRecenltyRequestedFile(fileData);
      if (dataChannel.readyState === "open") {
        sendFile(file);
      } else {
        console.log("Data channel is not ready. File will be sent once the data channel is open.");
      }
    });
  }

  async function sendOffer(target: string) {
    const offer = await peerConnection.createOffer();
    peerConnection.setLocalDescription(offer);
    const offerData: SocketFormat = {
      sender: socketService.socket?.id!,
      receiver: target,
      data: offer,
    };
    console.log("offerData", offerData);
    socketService.emit("offer", offerData);
  }

  async function handleOffer() {
    socketService.on("offer", async (data: SocketFormat) => {
      if (peerConnection.signalingState !== "stable") {
        console.warn("Cannot handle offer in signaling state: ", peerConnection.signalingState);
        return;
      }
      await peerConnection.setRemoteDescription(data.data as RTCSessionDescriptionInit);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      const answerData: SocketFormat = {
        sender: socketService.socket?.id!,
        receiver: data.sender,
        data: answer,
      };
      console.log("answer", answerData);
      socketService.emit("answer", answerData);
    });
  }

  async function handleAnswer() {
    socketService.on("answer", async (data: SocketFormat) => {
      console.log("answer", data);
      if (peerConnection.signalingState !== "have-local-offer") {
        console.warn("Cannot handle answer in signaling state: ", peerConnection.signalingState);
        return;
      }
      await peerConnection.setRemoteDescription(data.data as RTCSessionDescriptionInit);
    });
  }

  function gatherICECandidates() {
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateData: SocketFormat = {
          sender: socketService.socket?.id!,
          receiver: id!,
          data: event.candidate,
        };
        console.log("SEND ICE CANDIDATE", candidateData);
        socketService.emit("iceCandidate", candidateData);
      }
    };
  }

  async function handleICECandidate() {
    socketService.on("iceCandidate", async (data: SocketFormat) => {
      console.log("iceCandidate GET", data);
      if (peerConnection.remoteDescription) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.data));
      } else {
        console.warn("Received ICE candidate before remote description was set");
      }
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
