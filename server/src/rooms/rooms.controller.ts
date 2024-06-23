import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { WebsocketGateway } from '../websocket/websocket/websocket.gateway';
import { FileData } from 'src/types/room_model';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomServices: RoomsService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  @Post('create')
  createRooms() {
    return this.roomServices.createRoom();
  }

  @Get(':id')
  getRoomById(@Param('id') id: string) {
    return this.roomServices.getRoomById(id);
  }

  @Get()
  getRooms() {
    return this.roomServices.getRooms();
  }

  @Post(':id/upload')
  uploadFile(@Param('id') id: string, @Body('files') files: FileData[]) {
    const room = this.roomServices.uploadFile(id, files);
    this.websocketGateway.server.to(id).emit('roomStatus', room);
    return room;
  }
}
