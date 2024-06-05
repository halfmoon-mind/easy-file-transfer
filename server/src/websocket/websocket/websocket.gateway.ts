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

  @SubscribeMessage('offer')
  handleOffer(
    client: Socket,
    { offer, roomId }: { offer: RTCSessionDescriptionInit; roomId: string },
  ): void {
    this.server.to(roomId).emit('offer', offer);
  }

  @SubscribeMessage('answer')
  handleAnswer(
    client: Socket,
    { answer, roomId }: { answer: RTCSessionDescriptionInit; roomId: string },
  ): void {
    this.server.to(roomId).emit('answer', answer);
  }

  @SubscribeMessage('fileUploaded')
  handleFileUploaded(
    client: Socket,
    { fileName, roomId }: { fileName: string; roomId: string },
  ): void {
    this.roomsService.addFileToRoom(roomId, { name: fileName });
    const roomData = this.roomsService.getRoomById(roomId);
    this.server.to(roomId).emit('roomStatus', roomData);
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
