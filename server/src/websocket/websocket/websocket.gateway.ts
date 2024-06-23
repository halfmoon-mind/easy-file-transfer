import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from '../../rooms/rooms.service';
import SocketFormat from 'src/types/socket_format_model';

@WebSocketGateway({ cors: true })
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly roomsService: RoomsService) {}

  handleConnection(client: Socket) {
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
    if (roomClients) {
      client.emit('userCount', roomClients.size);
    }
  }

  leaveAllRooms(client: Socket): void {
    console.log(`Client ${client.id} left all rooms`);
    this.roomsService.removeUserFromRoom(client.id);

    const rooms = this.roomsService.getRooms();

    rooms.forEach((room) => {
      if (room.users.find((user) => user === client.id)) {
        this.server
          .to(room.id)
          .emit('roomStatus', this.roomsService.getRoomById(room.id));
      }
      client.leave(room.id);
    });
  }

  @SubscribeMessage('message')
  handleMessageEvent(client: Socket, data: any) {
    const format: SocketFormat = data;
    console.log(`Client ${client.id} sent message: ${data}`);
    this.server.to(format.receiver).emit('message', format);
  }

  @SubscribeMessage('uploadFile')
  handleUploadFile(client: Socket, socketData: SocketFormat) {
    const { receiver, data } = socketData;

    console.log(`Client ${client.id} uploaded file: ${data}`);
    this.roomsService.uploadFile(receiver, data);
    this.server
      .to(receiver)
      .emit('roomStatus', this.roomsService.getRoomById(receiver));
  }

  @SubscribeMessage('offer')
  async handleSendOffer(client: Socket, datas: SocketFormat) {
    const { receiver, data } = datas;
    console.log(`Client ${client.id} sent offer to ${receiver}`);
    const format: SocketFormat = {
      sender: client.id,
      receiver: receiver,
      data: data,
    };
    this.server.to(receiver).emit('offer', format);
  }

  @SubscribeMessage('answer')
  async handleSendAnswer(client: Socket, datas: SocketFormat) {
    const { receiver, data } = datas;
    console.log(`Client ${client.id} sent answer to ${receiver}`);
    const format: SocketFormat = {
      sender: client.id,
      receiver: receiver,
      data: data,
    };
    this.server.to(receiver).emit('answer', format);
  }

  @SubscribeMessage('iceCandidate')
  async handleIceCandidate(client: Socket, datas: SocketFormat) {
    const { receiver, data } = datas;
    console.log(`Client ${client.id} sent ICE candidate to ${receiver}`);
    const format: SocketFormat = {
      sender: client.id,
      receiver: receiver,
      data: data,
    };
    this.server.to(receiver).emit('iceCandidate', format);
  }
}
