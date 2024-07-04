import { useParams } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import { QrCodeImage } from '../components/QrcodeComponent';
import { useEffect, useState } from 'react';
import SocketFormat from '../types/SocketFormat';
import { Room } from '../types/Room';
import { FileUploadComponent } from '../components/FileUploadComponent';

const SharePage = () => {
  const id = useParams<{ id: string }>().id;
  const socket = useSocket(id ?? '');
  const [room, setRoom] = useState<Room | null>(null);
  // const [peerConnection] = useState(
  //   new RTCPeerConnection({
  //     iceServers: [
  //       { urls: 'stun:stun.l.google.com:19302' },
  //       { urls: 'stun:stun1.l.google.com:19302' },
  //       { urls: 'stun:stun2.l.google.com:19302' },
  //       { urls: 'stun:stun3.l.google.com:19302' },
  //       { urls: 'stun:stun4.l.google.com:19302' }
  //     ]
  //   })
  // );

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

  async function makeConnect() {
    return;
    // const offer = await peerConnection.createOffer();
    // await peerConnection.setLocalDescription(offer);
    // const receiver = room?.users.find((user) => user !== id);
    // const data: SocketFormat = {
    //   sender: id!,
    //   receiver: receiver!,
    //   data: offer
    // };
    // socket.emit('offer', data);
  }

  useEffect(() => {
    refreshRoomStatus();
  }, []);

  return (
    <div>
      id: {id}
      <QrCodeImage />
      <div>
        room: {room?.id}
        <div>users: {room?.users.map((user) => user)}</div>
      </div>
      <button onClick={() => makeConnect}>test</button>
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
