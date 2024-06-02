import { Controller, Get, Param, Post } from '@nestjs/common';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private roomServices: RoomsService) {}

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
}
