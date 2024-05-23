import { Injectable } from '@nestjs/common';
import { Room, File } from './room_model';

@Injectable()
export class RoomsService {
  // make room that will be used to store the rooms
  // also it's a private variable
  // and making room always use unique id
  private rooms: Room[] = [];

  // get all the rooms
  getRooms() {
    return this.rooms;
  }

  // get room by id
  getRoomById(id: string) {
    return this.rooms.find((room) => room.id === id);
  }

  // create a new room
  createRoom() {
    let id = Math.random().toString(36).substring(3, 9);
    while (this.rooms.find((room) => room.id === id)) {
      id = Math.random().toString(36).substring(7);
    }
    const room: Room = {
      id,
      users: [],
      files: [],
    };

    this.rooms.push(room);
    return room;
  }

  // add user to the room
  addUserToRoom(roomId: string, userId: string) {
    const room = this.rooms.find((room) => room.id === roomId);
    if (!room) {
      return null;
    }
    room.users.push({ id: userId });
    return room;
  }

  // remove user from the room
  removeUserFromRoom(roomId: string, userId: string) {
    const room = this.rooms.find((room) => room.id === roomId);
    if (!room) {
      return null;
    }
    room.users = room.users.filter((user) => user.id !== userId);
    room.files = room.files.filter((file) => {
      if (file.users.length === 1 && file.users[0].id === userId) {
        return false;
      }
      file.users = file.users.filter((user) => user.id !== userId);
      return true;
    });
    room.files = room.files.filter((file) => file.users.length > 0);

    if (room.users.length === 0) {
      this.rooms = this.rooms.filter((room) => room.id !== roomId);
    }

    return room;
  }

  // add file to the room
  addFileToRoom(roomId: string, file: File) {
    const room = this.rooms.find((room) => room.id === roomId);
    if (!room) {
      return null;
    }
    room.files.push(file);
    return room;
  }

  downloadFile(roomId: string, fileName: string) {
    const room = this.rooms.find((room) => room.id === roomId);
    if (!room) {
      return null;
    }
    const file = room.files.find((file) => file.name === fileName);
    if (!file) {
      return null;
    }
    return file;
  }
}
