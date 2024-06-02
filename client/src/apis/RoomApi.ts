import apiService from "../services/apiService";
import socketService from "../services/socketService";
import { Room } from "../types/Room";

export const PostRoomJoin = async (roomId: string) => {
    const response = await apiService.post<Room>(`/rooms/${roomId}/join`, {
        userId: socketService.socket?.id,
    });
    return response.data;
};
