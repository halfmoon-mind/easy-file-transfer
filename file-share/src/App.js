import React from "react";

function App() {
    return (
        <div>
            <input type="file" id="fileInput" />
            <button id="sendButton">Send File</button>
            <br />
            <div id="receivedFiles"></div>
            <br />
            <button id="downloadButton">Download Selected File</button>
        </div>
    );
}

export default App;
