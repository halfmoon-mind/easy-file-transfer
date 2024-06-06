import { Injectable } from '@nestjs/common';
import { FileData, Room } from './room_model';

@Injectable()
export class RoomsService {
  private rooms: Room[] = [];

  getRooms(): Room[] {
    return this.rooms;
  }

  getRoomById(id: string): Room {
    let room = this.rooms.find((room) => room.id === id);
    if (!room) {
      room = {
        id: id,
        users: [],
        files: [],
      };
      this.rooms.push(room);
    }
    return room;
  }

  createRoom(id?: string): Room {
    if (id) {
      let room = this.rooms.find((room) => room.id === id);
      if (room) {
        return room;
      } else {
        room = {
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

  addUserToRoom(roomId: string, userId: string): Room {
    let room = this.rooms.find((room) => room.id === roomId);

    if (!room) {
      console.log('room not found');
      room = this.createRoom(roomId);
    }
    const userExists = room.users.some((user) => user.id === userId);
    if (!userExists) {
      room.users.push({ id: userId });
    }
    this.rooms = this.rooms.map((currentRoom) =>
      currentRoom.id === roomId ? room : currentRoom,
    );
    console.log('rooms', this.rooms);
    console.log('room', room);
    return room;
  }

  removeUserFromRoom(userId: string): void {
    this.rooms = this.rooms
      .map((currentRoom) => {
        currentRoom.files = currentRoom.files.filter(
          (file) => file.user.id !== userId,
        );
        currentRoom.users = currentRoom.users.filter(
          (user) => user.id !== userId,
        );
        return currentRoom;
      })
      .filter((room) => room.users.length > 0);
  }

  uploadFile(id: string, files: FileData[]): Room {
    console.log(id);
    console.log('rooms', this.rooms);
    const room = this.rooms.find((room) => room.id === id);
    if (room) {
      room.files = [...room.files, ...files];
      console.log('room', room);
      return room;
    }
    const newRoom: Room = {
      id: id,
      users: [files[0].user],
      files: files,
    };

    this.rooms.push(newRoom);

    return newRoom;
  }
}
