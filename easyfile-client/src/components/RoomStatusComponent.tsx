import { FileData, Room } from '../types/Room';

export const RoomStatusComponent = ({
  room,
  handleFileClick
}: {
  room: Room;
  handleFileClick: (data: FileData) => void;
}) => {
  return (
    <div>
      <p>Room {room.id}</p>
      <p>Users</p>
      <ul>
        {room.users.map((user) => (
          <li key={user}>{user}</li>
        ))}
      </ul>
      <p>Files</p>
      <ul>
        {room.files.map((file) => (
          <li key={file.name} onClick={() => handleFileClick(file)}>
            {file.name}
          </li>
        ))}
      </ul>
    </div>
  );
};
