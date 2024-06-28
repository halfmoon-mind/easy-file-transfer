import { Injectable } from '@nestjs/common';
import { Room, FileData } from 'src/types/room_model';

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
    room.files = room.files.filter((file) => file.user !== id);
    return room;
  }

  getRoomByUserId(userId: string): Room {
    return this.rooms.find((room) =>
      room.users.some((user) => user === userId),
    );
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
    const userExists = room.users.some((user) => user === userId);
    if (!userExists) {
      room.users.push(userId);
    }
    this.rooms = this.rooms.map((currentRoom) =>
      currentRoom.id === roomId ? room : currentRoom,
    );
    return room;
  }

  removeUserFromRoom(userId: string): void {
    this.rooms = this.rooms
      .map((currentRoom) => {
        currentRoom.files = currentRoom.files.filter(
          (file) => file.user !== userId,
        );
        currentRoom.users = currentRoom.users.filter((user) => user !== userId);
        return currentRoom;
      })
      .filter((room) => room.users.length > 0);
  }

  uploadFile(roomId: string, files: FileData[]): Room {
    const room = this.rooms.find((room) => room.id === roomId);
    if (room) {
      room.files = [...room.files, ...files];
      return room;
    }
    const newRoom: Room = {
      id: roomId,
      users: [files[0].user],
      files: files,
    };

    this.rooms.push(newRoom);

    return newRoom;
  }
}
