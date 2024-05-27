import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoomsService } from './rooms/rooms.service';
import { RoomsController } from './rooms/rooms.controller';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
  controllers: [AppController, RoomsController],
  providers: [AppService, RoomsService],
})
export class AppModule {}
