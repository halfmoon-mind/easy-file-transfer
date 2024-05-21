import React from "react";

const SendButton = ({ onClick, disabled }) => (
    <button id="sendButton" onClick={onClick} disabled={disabled}>
        Send File
    </button>
);

export default SendButton;
