import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway(8081, { cors: true })
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleConnection(client: Socket, ..._args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.updateUserCount(client);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: string): void {
    client.join(room);
    this.server
      .to(room)
      .emit('roomStatus', `User ${client.id} joined room ${room}`);
    this.updateUserCount(client);
    console.log(`Client ${client.id} joined room ${room}`);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(client: Socket, room: string): void {
    client.leave(room);
    this.server
      .to(room)
      .emit('roomStatus', `User ${client.id} left room ${room}`);
    this.updateUserCount(client);
    console.log(`Client ${client.id} left room ${room}`);
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    client: Socket,
    message: { room: string; content: string },
  ): void {
    this.server.to(message.room).emit('newMessage', message.content);
  }

  @SubscribeMessage('userCount')
  handleUserCount(client: Socket, room: string): void {
    const roomClients = this.server.sockets.adapter.rooms.get(room);
    console.log('roomClients', roomClients);
    if (roomClients) {
      client.emit('userCount', roomClients.size);
    }
  }

  updateUserCount(client: Socket): void {
    const rooms = Array.from(client.rooms).filter((room) => room !== client.id);
    rooms.forEach((room) => {
      const roomClients = this.server.sockets.adapter.rooms.get(room);
      if (roomClients) {
        this.server.to(room).emit('userCount', roomClients.size);
      }
    });
  }
}
