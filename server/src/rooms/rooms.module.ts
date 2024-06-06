import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { WebsocketGateway } from '../websocket/websocket/websocket.gateway';

@Module({
  providers: [RoomsService, WebsocketGateway],
  controllers: [RoomsController],
  exports: [RoomsService, WebsocketGateway],
})
export class RoomsModule {}
