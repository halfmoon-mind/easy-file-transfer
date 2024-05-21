const express = require("express");
const https = require("https");
const socketIo = require("socket.io");
const cors = require("cors");
const fs = require("fs");

// Let's Encrypt에서 발급 받은 인증서와 키 파일 경로
const privateKey = fs.readFileSync("/home/ec2-user/easy-file-transfer/privkey.pem", "utf8");
const certificate = fs.readFileSync("/home/ec2-user/easy-file-transfer/fullchain.pem", "utf8");
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

const users = {};
const uploadedFiles = {};

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("register", (data) => {
        users[data.id] = socket.id;
        console.log("User registered:", data.id);
    });

    socket.on("uploadFile", (data) => {
        uploadedFiles[data.fileName] = data.uploaderId;
        io.emit("uploadFile", { fileName: data.fileName, uploaderId: data.uploaderId });
        console.log("File uploaded:", data.fileName);
    });

    socket.on("requestFile", (data) => {
        const { fileName, requesterId, uploaderId } = data;
        io.to(users[uploaderId]).emit("requestFile", { fileName, requesterId, uploaderId });
        console.log(`File request: ${fileName} from ${requesterId} to ${uploaderId}`);
    });

    socket.on("message", (message) => {
        const targetSocketId = users[message.target];
        if (targetSocketId) {
            io.to(targetSocketId).emit("message", message);
            console.log("Message sent to target:", message.target);
        } else {
            socket.broadcast.emit("message", message);
            console.log("Message broadcasted:", message);
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        for (let id in users) {
            if (users[id] === socket.id) {
                delete users[id];
                break;
            }
        }
    });
});

server.listen(8080, () => {
    console.log("Signaling server is running on https://easyfile.site:8080");
});

app.get("/", (req, res) => {
    res.send("HI");
});

app.get("/current-file", (req, res) => {
    // get recently uploaded file without remove it
    const fileName = Object.keys(uploadedFiles).pop();
    res.send({ fileName, uploaderId: uploadedFiles[fileName] });
});
