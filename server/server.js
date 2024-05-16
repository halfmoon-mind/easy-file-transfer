// server.js
const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

server.on('connection', (socket) => {
  socket.on('message', (message) => {
    // Broadcast to all connected clients
    server.clients.forEach((client) => {
      if (client !== socket && client.readyState === WebSocket.OPEN) {
        client.send(message);
        console.log('Message broadcasted:', message.toString());
      }
    });
  });
});

console.log('Signaling server is running on ws://localhost:8080');
