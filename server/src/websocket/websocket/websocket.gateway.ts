import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from 'src/rooms/rooms.service';

@WebSocketGateway(8081, { cors: true })
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly roomsService: RoomsService) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleConnection(client: Socket, ..._args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.leaveAllRooms(client);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, roomId: string): void {
    client.join(roomId);

    this.roomsService.addUserToRoom(roomId, client.id);

    const roomData = this.roomsService.getRoomById(roomId);
    console.log(`ROOM :roomData`, roomData);
    this.server.to(roomId).emit('roomStatus', roomData);
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    client: Socket,
    message: { room: string; content: string },
  ): void {
    this.server.to(message.room).emit('newMessage', message.content);
  }

  @SubscribeMessage('roomStatus')
  handleRoomStatus(client: Socket, roomId: string): void {
    const room = this.roomsService.getRoomById(roomId);
    this.server.to(roomId).emit('roomStatus', room);
  }

  @SubscribeMessage('userCount')
  handleUserCount(client: Socket, room: string): void {
    const roomClients = this.server.sockets.adapter.rooms.get(room);
    console.log('roomClients', roomClients);
    if (roomClients) {
      client.emit('userCount', roomClients.size);
    }
  }

  leaveAllRooms(client: Socket): void {
    console.log(`Client ${client.id} left all rooms`);
    this.roomsService.removeUserFromRoom(client.id);

    const rooms = this.roomsService.getRooms();

    rooms.forEach((room) => {
      if (room.users.includes({ id: client.id })) {
        this.server
          .to(room.id)
          .emit('roomStatus', this.roomsService.getRoomById(room.id));
      }
      client.leave(room.id);
    });
  }
}
