export interface Room {
    id: string;
    users: User[];
    files: FileData[];
}

export interface FileData {
    user: User;
    fileId: string;
    fileName: string;
}

export interface User {
    id: string;
}
