export interface Room {
  id: string;
  users: string[];
  files: FileData[];
}

export interface FileData {
  id: string;
  name: string;
  user: string;
  file: File;
}
