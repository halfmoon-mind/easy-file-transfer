import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket/websocket.gateway';
import { RoomsModule } from 'src/rooms/rooms.module';

@Module({
  imports: [RoomsModule],
  providers: [WebsocketGateway],
})
export class WebsocketModule {}
