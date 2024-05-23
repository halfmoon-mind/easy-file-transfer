export interface Room {
  id: string;
  users: User[];
  files: File[];
}

export interface File {
  name: string;
  size: number;
  type: string;
  users: User[];
}

export interface User {
  id: string;
}
