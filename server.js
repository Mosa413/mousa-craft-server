const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static("public"));

const players = {};
const blocks = new Map();

io.on("connection", (socket) => {
  console.log("Player connected: " + socket.id);
  
  players[socket.id] = {
    id: socket.id, x: 0.5, y: 10, z: 0.5,
    yaw: 0, pitch: 0, score: 0, name: "Player"
  };

  socket.emit("init", { players: players, blocks: Array.from(blocks.values()) });
  socket.broadcast.emit("newPlayer", players[socket.id]);

  socket.on("move", (d) => {
    if (players[socket.id]) {
      players[socket.id].x = d.x;
      players[socket.id].y = d.y;
      players[socket.id].z = d.z;
      players[socket.id].yaw = d.yaw;
      players[socket.id].pitch = d.pitch;
      socket.broadcast.emit("playerMoved", players[socket.id]);
    }
  });

  socket.on("chat", (m) => {
    if (players[socket.id] && m && m.length < 100) {
      io.emit("chatMsg", {
        id: socket.id,
        name: players[socket.id].name,
        text: m
      });
    }
  });

  socket.on("addScore", (p) => {
    if (players[socket.id]) {
      players[socket.id].score += p;
      io.emit("scoreUpdate", { id: socket.id, score: players[socket.id].score });
    }
  });

  socket.on("addBlock", (b) => {
    blocks.set(b.x + "," + b.y + "," + b.z, b);
    socket.broadcast.emit("blockAdded", b);
  });

  socket.on("removeBlock", (b) => {
    blocks.delete(b.x + "," + b.y + "," + b.z);
    socket.broadcast.emit("blockRemoved", b);
  });

  socket.on("disconnect", () => {
    console.log("Player left: " + socket.id);
    delete players[socket.id];
    io.emit("playerLeft", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on port " + PORT));
