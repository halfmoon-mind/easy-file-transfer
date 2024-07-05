import { useParams } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import { QrCodeImage } from '../components/QrcodeComponent';
import { useEffect, useState } from 'react';
import SocketFormat from '../types/SocketFormat';
import { Room } from '../types/Room';
import { FileUploadComponent } from '../components/FileUploadComponent';
import { RoomStatusComponent } from '../components/RoomStatusComponent';

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

  async function refreshRoomStatus() {
    socket.emit('roomStatus', id);
    socket.on('roomStatus', (data: Room) => {
      data.files = data.files.map((file) => ({
        ...file,
        file: new File([file.file], file.name, { type: file.file.type })
      }));
      console.log(data);
      setRoom(data);
    });
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
    });
  }

  async function handleAnswer() {
    socket.on('answer', async (data: SocketFormat) => {
      await peerConnection.setRemoteDescription(data.data);
      console.log('answer received');
    });
  }

  async function createICECandidate() {
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const receiver = room?.users.find((user) => user !== socket.id);
        const data: SocketFormat = {
          sender: socket.id!,
          receiver: receiver!,
          data: event.candidate
        };
        console.log('iceCandidate sent');
        socket.emit('iceCandidate', data);
      }
    };
  }

  function handleIceCandidate() {
    socket.on('iceCandidate', (data: SocketFormat) => {
      console.log('iceCandidate received');
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
    handleOffer();
    handleAnswer();
    createICECandidate();
    handleIceCandidate();
    connectionStatus();
  }, []);

  return (
    <div>
      id: {id}
      <QrCodeImage />
      <RoomStatusComponent room={room!} />
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
