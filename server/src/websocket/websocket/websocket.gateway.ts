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
    console.log(`Client ${client.id} sent message: ${data}`);
    this.server.to(data.room).emit('message', data);
  }

  @SubscribeMessage('uploadFile')
  handleUploadFile(client: Socket, socketData: SocketFormat) {
    const { receiver, data } = socketData;
    this.roomsService.uploadFile(receiver, data);
    this.server
      .to(receiver)
      .emit('roomStatus', this.roomsService.getRoomById(receiver));
  }

  @SubscribeMessage('requestFile')
  handleRequestFile(
    client: Socket,
    data: { fileId: string; requesterId: string },
  ) {
    console.log(`Client ${client.id} requested file: ${data.fileId}`);
    const room = this.roomsService.getRoomByUserId(data.requesterId);
    this.server
      .to(room.id)
      .emit('fileRequestResponse', data.fileId, data.requesterId);
  }

  @SubscribeMessage('sendOffer')
  async handleSendOffer(
    client: Socket,
    data: { sdp: RTCSessionDescriptionInit; target: string },
  ) {
    console.log(`Client ${client.id} sent offer to ${data.target}`);
    this.server
      .to(data.target)
      .emit('receiveOffer', { sdp: data.sdp, requesterId: client.id });
  }

  @SubscribeMessage('sendAnswer')
  async handleSendAnswer(
    client: Socket,
    data: { sdp: RTCSessionDescriptionInit; target: string },
  ) {
    console.log(`Client ${client.id} sent answer to ${data.target}`);
    this.server.to(data.target).emit('receiveAnswer', data.sdp);
  }

  @SubscribeMessage('iceCandidate')
  async handleIceCandidate(
    client: Socket,
    data: { candidate: RTCIceCandidateInit; target: string },
  ) {
    console.log(`Client ${client.id} sent ICE candidate to ${data.target}`);
    this.server.to(data.target).emit('iceCandidate', data.candidate);
  }
}
