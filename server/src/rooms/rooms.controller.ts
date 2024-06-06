import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { FileData } from './room_model';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomServices: RoomsService) {}

  @Post('create')
  createRooms() {
    return this.roomServices.createRoom(null);
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
    return this.roomServices.uploadFile(id, files);
  }
}
