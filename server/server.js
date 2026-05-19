import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";

import { Server } from "socket.io";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import Message from "./models/Message.js";
import messageRoutes from "./routes/messageRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Server running");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? process.env.CLIENT_URL : /^http:\/\/localhost:\d+$/,
  },
});

const onlineUsers = {};
let lastPresenceSignature = "";

const broadcastPresence = () => {
  const presenceSignature = JSON.stringify(Object.keys(onlineUsers).sort());

  if (presenceSignature === lastPresenceSignature) {
    return;
  }

  lastPresenceSignature = presenceSignature;
  io.emit("presence_update", Object.keys(onlineUsers));
};

io.on("connection", (socket) => {
  socket.on("join", (userId) => {
    if (onlineUsers[userId] === socket.id) {
      return;
    }

    onlineUsers[userId] = socket.id;
    broadcastPresence();
  });

  socket.on("send_message", async (data) => {
  const { senderId, receiverId, text } = data;

  try {
    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
    });

    const receiverSocketId = onlineUsers[receiverId];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive_message", newMessage);
    }

  } catch (error) {
    console.log(error);
  }
});

  socket.on("profile_updated", (updatedUser) => {
    io.emit("profile_updated", updatedUser);
  });

  socket.on("disconnect", () => {
    let changed = false;

    for (const userId in onlineUsers) {
      if (onlineUsers[userId] === socket.id) {
        delete onlineUsers[userId];
        changed = true;
      }
    }

    if (changed) {
      broadcastPresence();
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});