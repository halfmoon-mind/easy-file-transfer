import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { WebsocketGateway } from 'src/websocket/websocket/websocket.gateway';

@Module({
  providers: [RoomsService, WebsocketGateway],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
