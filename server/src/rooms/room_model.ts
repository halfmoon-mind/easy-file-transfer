export interface Room {
  id: string;
  users: User[];
  files: FileData[];
}

export interface FileData {
  id: string;
  file: File;
  user: User;
}

export interface User {
  id: string;
}
