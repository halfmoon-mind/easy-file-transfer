import { io, Socket } from "socket.io-client";
import { SOCKET_BASE_URL } from "./apiService";

class SocketService {
    socket: Socket | null = null;

    connect(roomId: string) {
        this.socket = io(SOCKET_BASE_URL);

        this.socket.on("connect", () => {
            console.log("Connected to socket server");
            this.socket?.emit("joinRoom", roomId);
        });

        this.socket.on("roomStatus", (status: string) => {
            console.log("STATUS : " + status);
        });

        this.socket.on("userCount", (count: number) => {
            console.log("User Count: ", count);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            console.log("Disconnected from socket server");
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
