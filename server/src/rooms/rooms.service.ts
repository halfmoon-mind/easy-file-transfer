import { Injectable } from '@nestjs/common';
import { FileData, Room } from './room_model';

@Injectable()
export class RoomsService {
  private rooms: Room[] = [];

  getRooms() {
    return this.rooms;
  }

  getRoomById(id: string) {
    const room = this.rooms.find((room) => room.id === id);
    if (!room) {
      const room: Room = {
        id: id,
        users: [],
        files: [],
      };
      this.rooms.push(room);
      return room;
    }
    return room;
  }

  createRoom(id: string | undefined) {
    if (id) {
      const room = this.rooms.find((room) => room.id === id);
      if (room) {
        return room;
      } else {
        const room: Room = {
          id: id,
          users: [],
          files: [],
        };
        this.rooms.push(room);
        return room;
      }
    }

    let randomId = Math.random().toString(36).substring(3, 9);
    while (this.rooms.find((room) => room.id === randomId)) {
      randomId = Math.random().toString(36).substring(7);
    }
    const room: Room = {
      id: randomId,
      users: [],
      files: [],
    };

    this.rooms.push(room);
    return room;
  }

  addUserToRoom(roomId: string, userId: string) {
    let room = this.rooms.find((room) => room.id === roomId);

    if (!room) {
      room = this.createRoom(roomId);
    }
    const userExists = room.users.some((user) => user.id === userId);
    if (!userExists) {
      room.users.push({ id: userId });
    }
    return room;
  }

  removeUserFromRoom(userId: string) {
    this.rooms = this.rooms.map((currentRoom) => {
      currentRoom.files = currentRoom.files.filter(
        (file) => file.user.id !== userId,
      );
      currentRoom.users = currentRoom.users.filter(
        (user) => user.id !== userId,
      );
      if (currentRoom.users.length === 0) {
        this.rooms = this.rooms.filter((room) => room.id !== currentRoom.id);
      }
      return currentRoom;
    });
  }

  addFileToRoom(roomId: string, file: FileData) {
    const room = this.getRoomById(roomId);
    room.files.push(file);
  }
}
