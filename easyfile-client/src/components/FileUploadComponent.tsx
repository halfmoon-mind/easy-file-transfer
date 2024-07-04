import { FileUploader } from 'react-drag-drop-files';
import { v4 as uuidv4 } from 'uuid';
import { FileData } from '../types/Room';

export const FileUploadComponent = ({
  onUploadFile,
  userId
}: {
  onUploadFile: (files: FileData[]) => void;
  userId: string;
}) => {
  return (
    <FileUploader
      name="file"
      multiple={true}
      label="UPLOAD HERE"
      onDrop={(e: File[]) => {
        const files = Array.from(e).map((file) => {
          const fileId = uuidv4();
          return {
            id: fileId,
            name: file.name,
            user: userId,
            file: file
          };
        });
        onUploadFile(files);
      }}
      onSelect={(e: File[]) => {
        const files = Array.from(e).map((file) => {
          const fileId = uuidv4();
          return {
            id: fileId,
            name: file.name,
            user: userId,
            file: file
          };
        });
        onUploadFile(files);
      }}
    />
  );
};
