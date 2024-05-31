import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from './apiService';
const CHUNK_SIZE = 16 * 1024;

class SocketService {
  socket: Socket | null = null;
  peerConnection: RTCPeerConnection | null = null;
  dataChannel: RTCDataChannel | null = null;
  iceCandidateQueue: RTCIceCandidate[] = [];
  db: IDBDatabase | null = null;

  connect(roomId: string) {
    this.socket = io(SOCKET_BASE_URL);

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
      this.socket?.emit('joinRoom', roomId);
    });

    this.socket.on('roomStatus', (status: string) => {
      console.log('STATUS : ' + status);
    });

    this.socket.on('userCount', (count: number) => {
      console.log('User Count: ', count);
    });

    this.socket.on('message', async (data) => {
      if (data.candidate) {
        console.log('Received ICE candidate:', data.candidate);
        if (this.peerConnection?.remoteDescription && this.peerConnection.remoteDescription.type) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log('ICE candidate added successfully');
          } catch (e) {
            console.error('Error adding received ICE candidate', e);
          }
        } else {
          this.iceCandidateQueue.push(data.candidate);
        }
      } else if (data.sdp) {
        console.log('Received SDP:', data.sdp);
        try {
          if (this.peerConnection) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            console.log('Remote SDP set successfully');
            while (this.iceCandidateQueue.length) {
              const candidate = this.iceCandidateQueue.shift();
              try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('Queued ICE candidate added successfully');
              } catch (e) {
                console.error('Error adding queued ICE candidate', e);
              }
            }
            if (data.sdp.type === 'offer') {
              const answer = await this.peerConnection.createAnswer();
              await this.peerConnection.setLocalDescription(answer);
              this.socket?.emit('message', { sdp: this.peerConnection.localDescription });
              console.log('Answer sent:', this.peerConnection.localDescription);
            }
          }
        } catch (e) {
          console.error('Error setting remote SDP', e);
        }
      }
    });

    this.socket.on('requestFile', this.handleIncomingRequest.bind(this));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      console.log('Disconnected from socket server');
    }
  }

  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket?.emit('message', { candidate: event.candidate });
        console.log('ICE candidate sent:', event.candidate);
      } else {
        console.log('All ICE candidates have been sent');
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      console.log('Data channel received:', event.channel);
      this.dataChannel = event.channel;
      this.setupDataChannel(this.dataChannel);
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection?.iceConnectionState === 'disconnected') {
        console.log('Peer disconnected');
      }
    };
  }

  setupDataChannel(channel: RTCDataChannel) {
    channel.onmessage = (event) => {
      const receivedData = event.data;

      if (typeof receivedData === 'string') {
        const metadata = JSON.parse(receivedData);
        currentFileMetadata = metadata;
        receivedFileBuffers[metadata.fileName] = [];
        const progressBar = document.getElementById('progressBar') as HTMLProgressElement;
        if (progressBar) {
          progressBar.value = 0;
          progressBar.max = metadata.fileSize;
          progressBar.style.display = 'block';
        }
      } else {
        const fileBuffer = receivedFileBuffers[currentFileMetadata.fileName];
        fileBuffer.push(receivedData);
        const progressBar = document.getElementById('progressBar') as HTMLProgressElement;
        if (progressBar) {
          progressBar.value += receivedData.byteLength;
        }
        console.log(`Received chunk: ${fileBuffer.length}, size: ${receivedData.byteLength}`);

        if (fileBuffer.reduce((acc, chunk) => acc + chunk.byteLength, 0) === currentFileMetadata.fileSize) {
          const blob = new Blob(fileBuffer);
          saveFile(blob, currentFileMetadata.fileName);
          console.log('File received completely:', currentFileMetadata.fileName);
          if (progressBar) {
            progressBar.style.display = 'none';
          }
        }
      }
    };
    channel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  }

  handleIncomingRequest(data: { fileName: string; requesterId: string; uploaderId: string }) {
    const { fileName, requesterId, uploaderId } = data;

    if (this.socket?.id === uploaderId) {
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.get(fileName);

      request.onsuccess = async (event) => {
        const fileRecord = event.target.result;
        if (fileRecord && this.peerConnection) {
          this.dataChannel = this.peerConnection.createDataChannel('fileTransfer');
          this.setupDataChannel(this.dataChannel);

          this.dataChannel.onopen = () => {
            sendFileInChunks(new Blob([fileRecord.fileData]));
          };

          const offer = await this.peerConnection.createOffer();
          await this.peerConnection.setLocalDescription(offer);
          this.socket?.emit('message', { sdp: this.peerConnection.localDescription, target: requesterId });
        } else {
          console.error('File not found in DB:', fileName);
        }
      };

      request.onerror = (event) => {
        console.error('Error retrieving file from DB:', event.target.errorCode);
      };
    }
  }
}

const socketService = new SocketService();
export default socketService;

let receivedFileBuffers: any = {};
let currentFileMetadata = {};

const sendFileInChunks = (file: Blob) => {
  const reader = new FileReader();
  let offset = 0;

  const metadata = {
    fileName: file.name,
    fileSize: file.size,
  };

  socketService.dataChannel?.send(JSON.stringify(metadata));
  console.log('Sent file metadata:', metadata);

  reader.onload = () => {
    if (socketService.dataChannel?.readyState === 'open') {
      const chunk = reader.result as ArrayBuffer;

      const sendChunk = () => {
        try {
          socketService.dataChannel?.send(chunk);
          console.log('Chunk sent:', offset, chunk);

          offset += chunk.byteLength;
          if (offset < file.size) {
            readSlice(offset);
          } else {
            console.log('All chunks sent');
          }
        } catch (e) {
          if (e.name === 'OperationError') {
            setTimeout(sendChunk, 100);
          }
        }
      };

      sendChunk(); // Initial attempt to send chunk
    }
  };

  const readSlice = (o: number) => {
    const slice = file.slice(o, o + CHUNK_SIZE);
    reader.readAsArrayBuffer(slice);
  };

  readSlice(0);
};

const saveFile = (blob: Blob, fileName: string) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const storeFileInDB = (fileName: string, fileData: ArrayBuffer, db: IDBDatabase) => {
  const transaction = db.transaction(['files'], 'readwrite');
  const store = transaction.objectStore('files');
  const fileRecord = { fileName, fileData };

  store.put(fileRecord);
  transaction.oncomplete = () => {
    console.log('File stored in DB:', fileName);
  };
  transaction.onerror = (event: Event) => {
    console.error('Error storing file in DB:');
  };
};

export { sendFileInChunks, saveFile, storeFileInDB };
