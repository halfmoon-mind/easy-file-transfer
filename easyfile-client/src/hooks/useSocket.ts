import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// const SOCKET_BASE_URL = "https://socket.easyfile.site";
const SOCKET_BASE_URL = 'http://localhost:8080';

const useSocket = (roomId: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_BASE_URL, {
      path: '/socket.io',
      transports: ['websocket']
    });

    const socket = socketRef.current;
    console.log('Connecting to socket server');

    socket.on('connect', () => {
      console.log('Connected to socket server');
      console.log('socket id : ', socket.id);
      socket.emit('joinRoom', roomId);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setIsConnected(false);
    });

    return () => {
      socket.emit('leaveRoom', roomId);
      socket.disconnect();
    };
  }, [roomId]);

  const emit = (event: string, data: any) => {
    socketRef.current?.emit(event, data);
  };

  const on = (event: string, callback: (data: any) => void) => {
    socketRef.current?.on(event, callback);
  };

  const off = (event: string, callback: (data: any) => void) => {
    socketRef.current?.off(event, callback);
  };

  const id = socketRef.current?.id;

  return { isConnected, emit, on, off, id };
};

export default useSocket;
