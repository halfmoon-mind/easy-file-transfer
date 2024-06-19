import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import QRCode from 'qrcode';
import socketService from 'src/services/socketService';

const CHUNK_SIZE = 16384;

const SharePage = () => {
  const { id } = useParams<{ id: string }>();
  const peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
  });

  useEffect(() => {
    validateRoomId(id);
    setQRCode();
    setSocketSetting(id!);
  }, [id]);

  return <div>id: {id}</div>;

  function refreshRoom(data: any): void {
    console.log('room status', data);
  }

  function setSocketSetting(id: string): void {
    socketService.connect(id);
    socketService.on('roomStatus', (data) => refreshRoom(data));
    handleOffer();
    handleAnswer();
  }

  async function sendOffer(target: string) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socketService.emit('offer', { target: target, data: offer });
  }

  async function handleOffer() {
    socketService.on('offer', async (data) => {
      await peerConnection.setRemoteDescription(data);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socketService.emit('answer', { target: 'answer', data: answer });
    });
  }

  async function handleAnswer() {
    socketService.on('answer', async (data) => {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
    });
  }

  function gatherICECandidates() {
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('iceCandidate', { type: 'candidate', candidate: event.candidate });
      }
    };
  }

  async function handleICECandidate() {
    socketService.on('iceCandidate', async (data) => {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data));
    });
  }
};

function setQRCode(): void {
  const canvas = document.getElementById('roomCode');
  QRCode.toCanvas(canvas, window.location.href, { color: { dark: '#000000' }, scale: 4 });
}

function validateRoomId(id: string | undefined): void {
  if (!id || id.length !== 6) {
    alert('방 ID는 6자리여야 합니다. 다시 시도해주세요.');
    window.location.href = '/';
  }
}

export default SharePage;
