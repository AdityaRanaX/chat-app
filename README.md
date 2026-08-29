# Chat App with Enterprise AI & Viva Architecture

A real-time chat application built with React, Node.js, Express, Socket.IO, MongoDB, featuring:
- **Server-Side Rendering (SSR)**
- **Redis Caching & Invalidation**
- **Multi-Step AI Agent & Function Calling**
- **LLM Evaluation Framework (LLM Eval)**
- **Event-Driven Architecture (Events Bus & SSE)**
- **Docker & Docker Compose Containerization**

---

## 🚀 Quick Launch Options

### Option A: Local Development (`npm run dev`)
```bash
npm run dev
```
- Client runs at: `http://localhost:5173`
- Express API runs at: `http://localhost:5000`
- SSR Dashboard page: `http://localhost:5000/ssr/dashboard`

### Option B: Docker Containerized Launch (`docker-compose`)
```bash
docker-compose up --build
```
Orchestrates 4 services: `chat-server`, `chat-client`, `redis`, and `mongo`.

---

## 🎓 Viva & Presentation Guide

For complete Q&A cheat sheet and explanation pointers for viva examination, see **[`VIVA_GUIDE.md`](VIVA_GUIDE.md)**.
In the Chat UI, click **🎓 Viva AI & System Inspector** at the bottom right to interactively demonstrate:
1. **Redis Cache**: Mode, Hits, Misses, Keys.
2. **Multi-Step Agent**: ReAct reasoning steps and tool execution.
3. **LLM Eval**: Tool call precision, groundedness, latency benchmarks.
4. **Event Bus**: Real-time SSE event stream log.
5. **SSR Preview**: Server-rendered HTML dashboard link.
