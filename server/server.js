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
import ssrRoutes from "./routes/ssrRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";
import evalRoutes from "./routes/evalRoutes.js";
import redisCache from "./config/redis.js";
import { invalidateCache } from "./middleware/cacheMiddleware.js";
import eventBus from "./events/eventBus.js";

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Main REST Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

// Enterprise Viva Modules
app.use("/ssr", ssrRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/eval", evalRoutes);

// Cache Inspector APIs
app.get("/api/cache/stats", (req, res) => {
  res.json(redisCache.getStats());
});

app.post("/api/cache/clear", async (req, res) => {
  await redisCache.clear();
  eventBus.publish("CACHE_INVALIDATED", { scope: "ALL" });
  res.json({ success: true, message: "Redis & In-memory cache cleared successfully" });
});

app.get("/", (req, res) => {
  res.send("Server running with SSR, Redis Caching, Multi-Step Agent, LLM Eval, and Event Bus enabled.");
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
  eventBus.publish("PRESENCE_UPDATED", { onlineCount: Object.keys(onlineUsers).length });
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

      // Invalidate relevant message cache keys
      await invalidateCache(`messages_${senderId}_${receiverId}`);
      await invalidateCache(`messages_${receiverId}_${senderId}`);

      // Publish system event
      eventBus.publish("MESSAGE_SENT", { senderId, receiverId, textSnippet: text.substring(0, 20) });

      const receiverSocketId = onlineUsers[receiverId];

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive_message", newMessage);
      }

    } catch (error) {
      console.log(error);
    }
  });

  socket.on("profile_updated", (updatedUser) => {
    invalidateCache("user_directory");
    eventBus.publish("PROFILE_UPDATED", { userId: updatedUser._id });
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
  console.log(`SSR Dashboard available at http://localhost:${PORT}/ssr/dashboard`);
});