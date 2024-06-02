import { io, Socket } from "socket.io-client";
import { SOCKET_BASE_URL } from "./apiService";
import { PostRoomJoin } from "../apis/RoomApi";

class SocketService {
    socket: Socket | null = null;

    connect(roomId: string) {
        this.socket = io(SOCKET_BASE_URL);

        this.socket.on("connect", async () => {
            console.log("Connected to socket server");
            this.socket?.emit("joinRoom", roomId);
            await PostRoomJoin(roomId);
            this.socket?.emit("roomStatus");
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.emit("leaveRoom");
            this.socket.disconnect();
        }
    }

    on(event: string, callback: (data: any) => void) {
        this.socket?.on(event, callback);
    }

    emit(event: string, data: any) {
        this.socket?.emit(event, data);
    }
}

const socketService = new SocketService();
export default socketService;
