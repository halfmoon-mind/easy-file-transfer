export interface Room {
  id: string;
  users: User[];
  files: FileData[];
}

export interface FileData {
  name: string;
  size: number;
  type: string;
  users: User[];
  data: File;
}

export interface User {
  id: string;
}
