function initializeSocket(httpServer) {
  const { Server } = require("socket.io");
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
    },
  });
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      socket.to(roomId).emit("user-joined", socket.id);
    });

    socket.on("offer", (data) => {
      socket.to(data.room).emit("offer", { sdp: data.sdp, from: socket.id });
    });

    socket.on("answer", (data) => {
      socket.to(data.room).emit("answer", { sdp: data.sdp, from: socket.id });
    });

    socket.on("ice-candidate", (data) => {
      socket.to(data.room).emit("ice-candidate", data.candidate);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}

module.exports = initializeSocket;
