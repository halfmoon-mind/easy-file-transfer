export interface Room {
    id: string;
    users: User[];
    files: FileData[];
}

export interface FileData {
    id: string;
    name: string;
    size: number;
    user: User;
}

export interface User {
    id: string;
}
