import { useParams } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import { QrCodeImage } from '../components/QrcodeComponent';
import { useCallback, useEffect, useState } from 'react';
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
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);

  const [receivedFileBuffers, setReceivedFileBuffers] = useState<{
    [key: string]: ArrayBuffer[];
  }>({});
  let currentFileMetadata: FileData | null = null;
  // const [currentFileMetadata, setCurrentFileMetadata] =
  //   useState<FileData | null>(null);

  const saveFile = (blob: Blob, fileName: string) => {
    console.log('Saving file:', fileName);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    console.log('File download initiated');
  };

  function handleRefreshRoomStatus() {
    socket.on('roomStatus', (room: Room) => {
      room.files = room.files.map((file) => ({
        ...file,
        file: new File([file.file], file.name, { type: file.file.type })
      }));
      console.log(room);
      setRoom(room);
    });
  }

  function refreshRoomStatus() {
    socket.emit('roomStatus', id);
  }

  async function createOffer() {
    const dataChannel = peerConnection.createDataChannel('dataChannel');
    setDataChannel(dataChannel);
    setupDataChannelListeners(dataChannel);

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

      peerConnection.ondatachannel = (event) => {
        const receivedDataChannel = event.channel;
        setDataChannel(receivedDataChannel);
        setupDataChannelListeners(receivedDataChannel);
      };

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

  async function setupDataChannelListeners(channel: RTCDataChannel) {
    channel.onopen = () => console.log('Data channel opened');
    channel.onclose = () => console.log('Data channel closed');
    channel.onerror = (error) => console.error('Data channel error:', error);
    channel.onmessage = (event) => {
      console.log('Data channel message', event.data);
      if (typeof event.data === 'string') {
        console.log('Received metadata:', event.data);
        try {
          const metadata: FileData = JSON.parse(event.data);
          // setCurrentFileMetadata(metadata);
          currentFileMetadata = metadata;
          console.log('Metadata parsed:', metadata);
          setReceivedFileBuffers((prev) => ({ ...prev, [metadata.id]: [] }));
        } catch (error) {
          console.error('Error parsing metadata:', error);
        }
      } else {
        if (currentFileMetadata !== null) {
          console.log('Received chunk:', event.data);
          setReceivedFileBuffers((prev) => {
            const fileBuffer = [
              ...(prev[currentFileMetadata!.id] || []),
              event.data
            ];
            const newBuffers = {
              ...prev,
              [currentFileMetadata!.id]: fileBuffer
            };

            const receivedSize = fileBuffer.reduce(
              (acc, chunk) => acc + chunk.byteLength,
              0
            );

            console.log(
              `Received size:${receivedSize}, total size:${currentFileMetadata!.file.size}`
            );

            // if (receivedSize >= currentFileMetadata!.file.size) {
            if (event.data.byteLength < CHUNK_SIZE) {
              console.log('File fully received, preparing download...');

              const allChunks = newBuffers[currentFileMetadata!.id];
              const blob = new Blob(allChunks, {
                type: currentFileMetadata!.file.type
              });

              saveFile(blob, currentFileMetadata!.name);

              const { [currentFileMetadata!.id]: _, ...remainingBuffers } =
                newBuffers;

              // setCurrentFileMetadata(null);
              currentFileMetadata = null;
              return remainingBuffers;
            }

            return newBuffers;
          });
        } else {
          console.log('Received chunk but no metadata');
        }
      }
    };
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
  }

  const handleFileRequest = useCallback(() => {
    const onRequestFile = (data: SocketFormat) => {
      console.log('File requested', data);
      console.log('Room', room);
      const targetFileData = room?.files.find(
        (file) => file.id === data.data.id
      );
      console.log('File requested', targetFileData);
      if (targetFileData) {
        console.log('File found', targetFileData);
        sendFileInChunks(new Blob([targetFileData.file]), targetFileData);
      }
    };

    socket.on('requestFile', onRequestFile);

    return () => {
      socket.off('requestFile', onRequestFile);
    };
  }, [room, socket]);

  useEffect(() => {
    const cleanup = handleFileRequest();
    return () => cleanup();
  }, [handleFileRequest]);

  const sendFileInChunks = (file: Blob, fileData: FileData) => {
    if (!dataChannel || dataChannel.readyState !== 'open') {
      console.error('Data channel not available or not open');
      return;
    }

    dataChannel.send(JSON.stringify(fileData));
    // setCurrentFileMetadata(fileData);
    currentFileMetadata = fileData;

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
      } else {
        console.error('Data channel not open');
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
        }}
        userId={socket.id!}
      />
    </div>
  );
};

export default SharePage;
