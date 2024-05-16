import logo from "./logo.svg";
import "./App.css";

function App() {
    return (
        <>
            <head>
                <title>P2P File Transfer</title>
            </head>
            <body>
                <input type="file" id="fileInput" />
                <button id="sendButton">Send File</button>
                <br />
                <div id="receivedFiles"></div>
                <br />
                <button id="downloadButton">Download Selected File</button>
                <script src="webrtc.js"></script>
            </body>
        </>

        // <div className="App">
        //   <header className="App-header">
        //     <img src={logo} className="App-logo" alt="logo" />
        //     <p>
        //       Edit <code>src/App.js</code> and save to reload.
        //     </p>
        //     <a
        //       className="App-link"
        //       href="https://reactjs.org"
        //       target="_blank"
        //       rel="noopener noreferrer"
        //     >
        //       Learn React
        //     </a>
        //   </header>
        // </div>
    );
}

export default App;
