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
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: string): void {
    client.join(room);
    this.server
      .to(room)
      .emit('roomStatus', `User ${client.id} joined room ${room}`);
    console.log(`Client ${client.id} joined room ${room}`);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(client: Socket, room: string): void {
    client.leave(room);
    this.server
      .to(room)
      .emit('roomStatus', `User ${client.id} left room ${room}`);
    console.log(`Client ${client.id} left room ${room}`);
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    client: Socket,
    message: { room: string; content: string },
  ): void {
    this.server.to(message.room).emit('newMessage', message.content);
  }
}
