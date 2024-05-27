import React, { useState } from "react";
import FileInput from "../components/FileInput";
import SendButton from "../components/SendButton";
import "../assets/styles/MainPage.css";

import Description from "../components/Description";
import api from "../services/apiService";

const MainPage = () => {
    const [file, setFile] = useState(null);
    const [disabled, setDisabled] = useState(true);
    const [roomId, setRoomId] = useState(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setFile(file);
        setDisabled(false);
    };

    const handleSendClick = async () => {
        const result = await api.post("rooms/create");
        const { id } = result.data.id;
        window.location.href = `/rooms/${id}`;
    };

    const handleGoingToRoom = () => {
        window.location.href = `/rooms/${roomId}`;
    };

    return (
        <div id="root">
            <FileInput onChange={handleFileChange} />
            <SendButton onClick={handleSendClick} disabled={disabled} />
            <Description />
            <input type="text" placeholder="Enter Room ID" onChange={(event) => setRoomId(event.target.value)} />
            <button onClick={handleGoingToRoom}>Go to Room</button>
        </div>
    );
};

export default MainPage;
