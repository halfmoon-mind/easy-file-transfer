import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from './apiService';

class SocketService {
  socket: Socket | null = null;

  connect(roomId: string) {
    this.socket = io(SOCKET_BASE_URL, {
      path: '/socket.io',
      transports: ['websocket'],
    });

    console.log('Connecting to socket server');

    this.socket.on('connect', async () => {
      console.log('Connected to socket server');
      console.log('socket id : ', this.socket?.id);
      this.socket?.emit('joinRoom', roomId);
    });
  }

  disconnect(roomId: string) {
    if (this.socket) {
      this.socket.emit('leaveRoom', roomId);
      this.socket.disconnect();
    }
  }

  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  off(event: string, callback: (data: any) => void) {
    this.socket?.off(event, callback);
  }
}

const socketService = new SocketService();
export default socketService;
