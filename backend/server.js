const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth.routes");
const postRoutes = require("./routes/post.routes");
const userRoutes = require("./routes/user.routes");
const chatRoutes = require("./routes/chat.routes");
const adminRoutes = require("./routes/admin.routes");
const cleanupExpiredPosts = require("./utils/cleanupExpiredPosts");
const searchRoutes = require("./routes/search.routes");
const hashtagRoutes = require("./routes/hashtag.routes");

// ✅ CREATE APP FIRST
const app = express();

// ✅ MIDDLEWARE
app.use(cors());
app.use(express.json());

// ✅ ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/search", searchRoutes);
app.use("/api/hashtags", require("./routes/hashtag.routes"));



// ✅ CREATE HTTP SERVER FROM APP
const server = http.createServer(app);



// ✅ ATTACH SOCKET.IO TO SERVER
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.set("io",io);

// ✅ SOCKET CONNECTION
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("sendMessage", (data) => {
    const { roomId, message } = data;

    // send only to users in the same room
    io.to(roomId).emit("receiveMessage", message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ✅ CONNECT MONGODB & START SERVER
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");

    // ✅ IMPORTANT: USE server.listen NOT app.listen
    server.listen(5000, "0.0.0.0", () => {
      console.log("Server running on port 5000 WITH SOCKET.IO");
    });
    setInterval(cleanupExpiredPosts, 60 * 60 * 1000); // every 1 hour
  })
  .catch((err) => console.log("MongoDB Error:", err));
