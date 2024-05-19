const express = require("express");
const https = require("https");
const socketIo = require("socket.io");
const cors = require("cors");

const privateKey = fs.readFileSync("key.pem", "utf8");
const certificate = fs.readFileSync("cert.pem", "utf8");
const credentials = { key: privateKey, cert: certificate };

const app = express();
const server = https.createServer(credentials, app);
const io = socketIo(server, {
    cors: {
        origin: "*", // 모든 출처 허용. 특정 출처만 허용하려면 여기에 출처를 지정
        methods: ["GET", "POST"],
    },
});

app.use(cors());

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("message", (message) => {
        // Broadcast to all connected clients except the sender
        socket.broadcast.emit("message", message);
        console.log("Message broadcasted:", message);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

server.listen(8080, () => {
    console.log("Signaling server is running on http://localhost:8080");
});
