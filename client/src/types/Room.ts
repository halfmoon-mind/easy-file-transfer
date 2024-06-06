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

export interface InternalFileData {
    fileId: string;
    file: File;
}

export interface User {
    id: string;
}
