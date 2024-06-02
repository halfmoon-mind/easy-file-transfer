import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { File } from './room_model';

@Controller('rooms')
export class RoomsController {
  constructor(private roomServices: RoomsService) {}

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

  @Post(':roomId/upload-file')
  uploadFile(@Param('roomId') roomId: string, @Body() file: File) {
    return this.roomServices.addFileToRoom(roomId, file);
  }

  @Post(':roomId/join')
  addUserToRoom(@Param('roomId') roomId: string, @Body() userId: string) {
    return this.roomServices.addUserToRoom(roomId, userId);
  }

  @Post(':roomId/upload')
  uploadFileToRoom(@Param('roomId') roomId: string, @Body() file: File) {
    return this.roomServices.addFileToRoom(roomId, file);
  }
}
