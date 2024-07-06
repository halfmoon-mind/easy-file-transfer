import { useParams } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import { QrCodeImage } from '../components/QrcodeComponent';
import { useEffect, useState } from 'react';
import SocketFormat from '../types/SocketFormat';
import { FileData, Room } from '../types/Room';
import { FileUploadComponent } from '../components/FileUploadComponent';
import { RoomStatusComponent } from '../components/RoomStatusComponent';

const CHUNK_SIZE = 16384;

const SharePage = () => {
  const id = useParams<{ id: string }>().id;
  const socket = useSocket(id ?? '');
  const [room, setRoom] = useState<Room>({
    id: id!,
    users: [],
    files: []
  });
  const [peerConnection] = useState(
    new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    })
  );
  const [dataChannel] = useState(
    peerConnection.createDataChannel('dataChannel')
  );

  dataChannel.addEventListener('open', (_) => {
    console.log('dataChannel opened');
  });

  dataChannel.addEventListener('message', (event) => {
    console.log('dataChannel message:', event.data);
  });

  dataChannel.addEventListener('close', (_) => {
    console.log('dataChannel closed');
  });

  function handleRefreshRoomStatus() {
    socket.on('roomStatus', (room: Room) => {
      room.files = room.files.map((file) => ({
        ...file,
        file: new File([file.file], file.name, { type: file.file.type })
      }));
      console.log(data);
      setRoom(room);
    });
  }

  function refreshRoomStatus() {
    socket.emit('roomStatus', id);
  }

  async function createOffer() {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    const receiver = room?.users.find((user) => user !== socket.id);
    const data: SocketFormat = {
      sender: socket.id!,
      receiver: receiver!,
      data: offer
    };
    console.log('offer sent');
    socket.emit('offer', data);
  }

  async function handleOffer() {
    socket.on('offer', async (data: SocketFormat) => {
      console.log('offer received');
      await peerConnection.setRemoteDescription(data.data);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      const response: SocketFormat = {
        sender: id!,
        receiver: data.sender,
        data: answer
      };
      console.log('answer sent');
      socket.emit('answer', response);
      createICECandidate();
    });
  }

  async function handleAnswer() {
    socket.on('answer', async (data: SocketFormat) => {
      await peerConnection.setRemoteDescription(data.data);
      console.log('answer received');
      createICECandidate();
    });
  }

  async function createICECandidate() {
    peerConnection.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        const receiver = room?.users.find((user) => user !== socket.id);
        const data: SocketFormat = {
          sender: socket.id!,
          receiver: receiver!,
          data: { 'new-ice-candidate': event.candidate }
        };
        console.log(`iceCandidate sent: ${JSON.stringify(data, null, 2)}`);
        socket.emit('iceCandidate', data);
      }
    });
  }

  function handleIceCandidate() {
    socket.on('iceCandidate', (data: SocketFormat) => {
      console.log(`iceCandidate received : ${data}`);
      peerConnection.addIceCandidate(data.data);
    });
  }

  function connectionStatus() {
    peerConnection.addEventListener('connectionstatechange', (_) => {
      if (peerConnection.connectionState === 'connected') {
        console.log('Connection state change:', peerConnection.connectionState);
      }
    });
  }

  useEffect(() => {
    refreshRoomStatus();
    handleRefreshRoomStatus();
    handleOffer();
    handleAnswer();
    handleIceCandidate();
    connectionStatus();
    handleFileRequest();
  }, []);

  function handleFileClick(targetFileData: FileData) {
    const sender = socket.id!;
    const receiver = room?.files.find(
      (file) => file.id === targetFileData.id
    )?.user;
    if (sender == receiver) {
      const url = URL.createObjectURL(targetFileData.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = targetFileData.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
    const data: SocketFormat = {
      sender: sender,
      receiver: receiver!,
      data: targetFileData
    };
    socket.emit('requestFile', data);
    console.log('File clicked', data);
    console.log('RoomStatus', room);
  }

  function handleFileRequest() {
    socket.on('requestFile', (data: SocketFormat) => {
      console.log('File requested', data);
      console.log('Room', room);
      const targetFileData = room?.files.find(
        (file) => file.id === data.data.id
      );
      console.log('File requested', targetFileData);
      if (targetFileData) {
        console.log('File found', targetFileData);
        sendFileInChunks(new Blob([targetFileData.file]));
      }
    });
  }

  const sendFileInChunks = (file: Blob) => {
    const reader = new FileReader();
    let offset = 0;
    reader.onload = () => {
      if (dataChannel.readyState === 'open') {
        const chunk = reader.result as ArrayBuffer;
        const sendChunk = () => {
          try {
            dataChannel.send(chunk);
            console.log('Chunk sent', offset, chunk);
            offset += chunk.byteLength;
            if (offset < file.size) {
              readSlice(offset);
            } else {
              console.log('File sent');
            }
          } catch (error) {
            console.error('Error sending chunk', error);
            setTimeout(sendChunk, 100);
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
  };

  return (
    <div>
      id: {id}
      <QrCodeImage />
      <RoomStatusComponent room={room!} handleFileClick={handleFileClick} />
      <button onClick={() => createOffer()}>test</button>
      <FileUploadComponent
        onUploadFile={(files) => {
          socket.emit('uploadFile', { receiver: id, data: files });
          refreshRoomStatus();
        }}
        userId={socket.id!}
      />
    </div>
  );
};

export default SharePage;
