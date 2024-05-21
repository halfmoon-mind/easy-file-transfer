import React, { useEffect, useState } from "react";
import FileInput from "../components/FileInput";
import SendButton from "../components/SendButton";
import "../assets/styles/MainPage.css";

import Description from "../components/Description";

const MainPage = () => {
    const [file, setFile] = useState(null);
    const [disabled, setDisabled] = useState(true);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setFile(file);
        setDisabled(false);
    };

    const handleSendClick = () => {
        const id = Math.random().toString(36).substring(7);
        const fileName = file.name;
        window.location.href = `/file/${id}?name=${fileName}`;
    };

    return (
        <div id="root">
            <FileInput onChange={handleFileChange} />
            <SendButton onClick={handleSendClick} disabled={disabled} />
            <Description />
        </div>
    );
};

export default MainPage;
