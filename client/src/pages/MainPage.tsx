import React, { useState } from "react";
import "../assets/styles/MainPage.css";

import Description from "../components/Description";
import apiService from "../services/apiService";

const MainPage = () => {
    const [roomId, setRoomId] = useState("");

    const handleMakeRoom = async () => {
        const result = await apiService.post("/rooms/create");
        const id = result.data.id;
        window.location.href = `/rooms/${id}`;
    };

    const handleGoingToRoom = () => {
        if (roomId.length < 6) {
            alert("방 ID를 6자리로 입력해주세요.");
            return;
        }
        window.location.href = `/rooms/${roomId}`;
    };

    const maxLengthCheck = (object: any) => {
        if (object.target.value.length > object.target.maxLength) {
            object.target.value = object.target.value.slice(0, object.target.maxLength);
        }
    };

    const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        handleGoingToRoom();
    };

    return (
        <div id="root">
            <Description />
            <form onSubmit={onSubmit}>
                <input
                    type="text"
                    placeholder="방 ID를 입력해주세요"
                    maxLength={6}
                    onInput={maxLengthCheck}
                    value={roomId || ""}
                    onChange={(event) => setRoomId(event.target.value)}
                />
            </form>
            <div style={{ height: "40px" }}></div>
            <button onClick={handleGoingToRoom}>Go to Room</button>
            <button onClick={handleMakeRoom}>Create Room</button>
        </div>
    );
};

export default MainPage;
