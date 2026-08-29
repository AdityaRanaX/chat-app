# 🎓 Complete Viva Guide & Examination Cheatsheet

This guide prepares you to answer questions on **Server-Side Rendering (SSR)**, **Caching with Redis**, **Multi-Step Agent Architecture**, **Function Calling & Tool Use**, **LLM Evaluation (Eval)**, **Event-Driven Architecture**, and **Docker Containerization**.

---

## 1. Server-Side Rendering (SSR)

### What is SSR and how is it implemented in this project?
- **Definition**: Server-Side Rendering (SSR) generates HTML markup on the server for each HTTP request before sending it to the client browser.
- **Implementation in Project**: 
  - Express SSR route: `GET /ssr/dashboard` (in [`ssrRoutes.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/routes/ssrRoutes.js)).
  - View generator: [`ssrDashboard.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/views/ssrDashboard.js) compiles live system stats, active users, and cache hit metrics into pre-rendered HTML.
- **SSR vs CSR (Client-Side Rendering)**:
  - **CSR (React app at `/`)**: Browser receives blank HTML, downloads large JavaScript bundles, and renders UI on the client device.
  - **SSR (Express route at `/ssr/dashboard`)**: Server executes rendering, returning ready-to-display HTML. Reduces **First Contentful Paint (FCP)** and allows search engines to index page content easily for **SEO**.

---

## 2. Caching with Redis

### What is Redis caching and why is it used?
- **Definition**: Redis is an in-memory key-value data structure store used as a database cache and message broker.
- **Implementation in Project**:
  - Redis Manager: [`redis.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/config/redis.js) connects to Redis server on port 6379, with an automatic in-memory fallback store if Redis server is offline.
  - Cache Middleware: [`cacheMiddleware.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/middleware/cacheMiddleware.js) caches GET responses for `/api/users` and `/api/messages/:id1/:id2` with a TTL (Time To Live).
  - Demonstrates cache hits/misses via response headers: `X-Cache: HIT` vs `X-Cache: MISS`.
- **Cache Invalidation Strategy**:
  - When a user sends a message (`socket.on('send_message')`) or updates profile (`socket.on('profile_updated')`), stale cache entries are automatically deleted (`invalidateCache()`) to maintain **cache consistency**.

---

## 3. Multi-Step AI Agent & Function Calling / Tool Use

### What is a Multi-Step AI Agent and Function Calling?
- **Definition**: An AI Agent uses the **ReAct (Reason + Act)** pattern to autonomously break complex user prompts into sequential reasoning steps, select structured tools, execute them, observe results, and synthesize a final response.
- **Implementation in Project**:
  - ReAct Reasoning Engine: [`multiStepAgent.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/agent/multiStepAgent.js) executes 4 distinct phases:
    1. **Planning**: Intent analysis and tool selection.
    2. **Function Calling (Tool Call)**: Invokes selected JavaScript tool with JSON parameters.
    3. **Observation**: Collects output from database/cache queries.
    4. **Synthesis**: Synthesizes final response for user.
  - Tool Schemas: Defined in [`agentTools.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/agent/agentTools.js) using JSON Schema standards (`get_user_directory`, `get_chat_history_summary`, `search_knowledge_base`, `calculate_analytics`).

---

## 4. LLM Evaluation Framework (LLM Eval)

### How do we evaluate AI Agent output quality?
- **Definition**: LLM Eval tests and scores AI models on standardized benchmarks to measure accuracy, hallucination rate, and execution speed.
- **Implementation in Project**:
  - Eval Engine: [`evalEngine.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/eval/evalEngine.js) runs benchmark test suites against the agent.
  - Evaluates 4 key metrics:
    1. **Tool Selection Precision (%)**: Accuracy of selected tools versus expected schema.
    2. **Groundedness Score (%)**: Degree of factual consistency with system database.
    3. **Average Latency (ms)**: End-to-end execution speed.
    4. **Relevance Score (%)**: Semantic alignment with prompt.
  - Endpoint: `POST /api/eval/run` and accessible via Viva Inspector UI.

---

## 5. Event-Driven Architecture (Events & Pub/Sub)

### What is Event-Driven Architecture in this application?
- **Definition**: An architecture where decoupled micro-components communicate by emitting and reacting to events asynchronously rather than direct tight coupling.
- **Implementation in Project**:
  - System Event Bus: [`eventBus.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/events/eventBus.js) using Node `EventEmitter` and Redis Pub/Sub pattern.
  - Emitted Events: `MESSAGE_SENT`, `CACHE_INVALIDATED`, `AGENT_STEP_EXECUTED`, `EVALUATION_COMPLETED`.
  - Real-Time Streaming: Server-Sent Events (SSE) stream endpoint `GET /api/events/stream` sends live event streams directly to the Viva Inspector drawer in client UI.

---

## 6. Containerization with Docker & Docker Compose

### How is containerization structured?
- **Definition**: Containerization packages applications and their dependencies into lightweight, isolated containers that run consistently across environments.
- **Implementation in Project**:
  - [`Dockerfile` (Server)](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/Dockerfile): Packages Node.js Express server + SSR + Agent + Socket.IO.
  - [`Dockerfile` (Client)](file:///c:/Users/Aditya%20rana/Desktop/chat-app/client/Dockerfile): Multi-stage build compiling React Vite client served with Nginx on port 80.
  - [`docker-compose.yml`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/docker-compose.yml): Multi-container orchestration managing `chat-server`, `chat-client`, `redis` (port 6379), and `mongo` (port 27017).
  - Launch Command: `docker-compose up --build`.

---

## Quick Reference Summary for Examiner Questions

| Topic | Primary File Pointers | Key Keyword Answers |
| --- | --- | --- |
| **Server-Side Rendering** | [`ssrRoutes.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/routes/ssrRoutes.js), [`ssrDashboard.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/views/ssrDashboard.js) | Server HTML pre-rendering, First Contentful Paint (FCP), SEO, Hydration. |
| **Redis Caching** | [`redis.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/config/redis.js), [`cacheMiddleware.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/middleware/cacheMiddleware.js) | In-memory key-value cache, TTL, Cache-Aside pattern, `X-Cache: HIT/MISS`. |
| **Multi-Step Agent** | [`multiStepAgent.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/agent/multiStepAgent.js), [`agentTools.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/agent/agentTools.js) | ReAct loop (Reason+Act), Autonomous step decomposition, Observation loop. |
| **Function Calling** | [`agentTools.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/agent/agentTools.js) | JSON Schema parameters, Tool dispatching, Structured execution. |
| **LLM Eval** | [`evalEngine.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/eval/evalEngine.js), [`evalRoutes.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/routes/evalRoutes.js) | Tool Precision, Groundedness, Hallucination testing, Benchmark Suite. |
| **Events / PubSub** | [`eventBus.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/events/eventBus.js), [`eventRoutes.js`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/routes/eventRoutes.js) | Event-driven architecture, EventEmitter, SSE stream, Decoupling. |
| **Containerization** | [`docker-compose.yml`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/docker-compose.yml), [`Dockerfile`](file:///c:/Users/Aditya%20rana/Desktop/chat-app/server/Dockerfile) | Multi-container orchestration, Isolation, Microservices deployment. |
