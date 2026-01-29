const { Server } = require("socket.io");

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // later you can restrict this
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 New socket connected:", socket.id);

    socket.on("typing", ({ roomId, userId }) => {
      socket.to(roomId).emit("userTyping", { userId });
    });

    socket.on("stopTyping", ({ roomId, userId }) => {
      socket.to(roomId).emit("userStopTyping", { userId });
    });

    // Join chat room
    socket.on("joinRoom", (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    // Receive message and broadcast
    socket.on("sendMessage", (data) => {
      const { roomId, message } = data;

      io.to(roomId).emit("receiveMessage", message);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });

    socket.on("joinGroup", (roomId) => {
  socket.join(roomId);
});

socket.on("sendGroupMessage", ({ roomId, message }) => {
  socket.to(roomId).emit("receiveMessage", message);
});

socket.on("post:unsave", ({ postId }) => {
  io.emit("post:unsave:update", { postId });
});


  });
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

module.exports = {
  initSocket,
  getIO,
};
