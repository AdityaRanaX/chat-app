# High-Level Design (HLD)

## 1. Architecture summary

Chat App follows a client-server architecture with a REST API for account, profile, user-directory, and history operations, plus Socket.IO for low-latency events. MongoDB stores users and messages. Electron is an optional desktop shell that displays the Vite client.

```text
┌─────────────────────────────────────────────────────────────┐
│ Browser / Electron desktop window                            │
│ React + Vite client                                          │
│ - authentication and routing                                 │
│ - chat UI, profile editor, theme, local session              │
└───────────────┬───────────────────────────────┬─────────────┘
                │ HTTPS/REST                    │ Socket.IO
                ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Node.js / Express application                                │
│ - auth, users, message REST routes                           │
│ - JWT middleware                                             │
│ - Socket.IO message, presence, and profile-update events    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose
                               ▼
                     ┌──────────────────┐
                     │ MongoDB          │
                     │ users, messages  │
                     └──────────────────┘
```

## 2. Major components

| Component | Technology | Responsibility |
| --- | --- | --- |
| Web client | React 19, Vite, React Router | Renders registration, login, and chat screens; owns local UI state. |
| HTTP client | Axios | Makes REST calls to the Express API and includes the stored Bearer token for protected routes. |
| Real-time client | socket.io-client | Joins the current user, sends messages, and receives messages, presence, and profile events. |
| API server | Node.js, Express | Exposes auth, users, and messages endpoints; applies JSON parsing and CORS. |
| Real-time server | Socket.IO | Maintains the in-memory online-user mapping and routes real-time events. |
| Data access | Mongoose | Defines and reads/writes User and Message MongoDB collections. |
| Data store | MongoDB | Persists user account/profile data and direct-message history. |
| Desktop shell | Electron | Loads the Vite app and adapts window dimensions for authentication and chat routes. |

## 3. Client design

The client is organized by responsibility:

- `client/src/App.jsx` defines public routes (`/register`, `/login`), the protected `/chat` route, and the fallback page.
- `client/src/pages/Register.jsx` submits registration details and routes successful registrations to login.
- `client/src/pages/Login.jsx` authenticates the user, stores the returned user payload in `localStorage` as `userInfo`, and opens chat.
- `client/src/pages/Chat.jsx` manages selected conversation, message cache, unread notifications, online status, theme, profile editing, and image cropping.
- `client/src/socket/socket.js` creates the Socket.IO client connection to the server.

`userInfo` includes the authenticated user's profile and token. It supports client navigation and API authorization; server middleware remains the authority for protected data.

## 4. Server design

The server entry point is `server/server.js`. It initializes environment variables, connects to MongoDB, configures Express, registers REST routes, creates the HTTP server, and attaches Socket.IO.

### REST resource groups

| Resource group | Base path | Purpose |
| --- | --- | --- |
| Authentication | `/api/auth` | Register, log in, and fetch the current authenticated user. |
| Users | `/api/users` | List other users and update the authenticated user's profile. |
| Messages | `/api/messages` | Fetch direct-message history for two user identifiers. |

JWT middleware protects the current-user, user list, profile update, and message history endpoints. Password comparison and hashing are handled with bcrypt.

### Real-time event flow

| Event | Direction | Purpose |
| --- | --- | --- |
| `join` | Client → server | Associates a user ID with the connected socket and broadcasts updated presence. |
| `presence_update` | Server → clients | Delivers the current list of online user IDs. |
| `send_message` | Client → server | Sends sender ID, receiver ID, and text for persistence and delivery. |
| `receive_message` | Server → recipient | Delivers a persisted message to an online receiver. |
| `profile_updated` | Client → server → clients | Shares an updated profile payload with connected clients. |

Online presence is intentionally transient: it is an in-memory mapping from user ID to one socket ID. It resets when the server restarts.

## 5. Data design

### User collection

| Field | Description |
| --- | --- |
| `_id` | MongoDB user identifier. |
| `name` | Required display name. |
| `email` | Required, unique email address. |
| `password` | Required bcrypt password hash; excluded from user-list responses. |
| `age` | Required positive number. |
| `phone` | Required phone value. |
| `profilePic` | Optional data-URL string for the profile image. |
| `createdAt`, `updatedAt` | Mongoose timestamps. |

### Message collection

| Field | Description |
| --- | --- |
| `_id` | MongoDB message identifier. |
| `senderId` | Required sender user identifier. |
| `receiverId` | Required receiver user identifier. |
| `text` | Required message content. |
| `createdAt`, `updatedAt` | Mongoose timestamps; history is ordered by `createdAt` ascending. |

## 6. Core flows

### Authentication

```text
React form → POST /api/auth/register or /login → Express controller
→ User lookup/create + bcrypt → JWT issued → user payload returned
→ client stores userInfo → protected chat route
```

### Message delivery

```text
Sender enters text → socket.emit(send_message)
→ Socket.IO server creates Message in MongoDB
→ receiver socket lookup
→ receiver online: emit receive_message
→ receiver offline: message remains available through history endpoint
```

### Conversation retrieval

```text
User selects chat → GET /api/messages/:senderId/:receiverId with JWT
→ controller queries either direction for the pair
→ results sorted oldest to newest → client renders conversation
```

## 7. Security and operational considerations

- MongoDB and JWT configuration are externalized through `MONGO_URI` and `JWT_SECRET` environment variables.
- Passwords are salted and hashed with bcrypt before storage.
- Protected REST endpoints require `Authorization: Bearer <token>`.
- Socket events currently use the supplied user IDs and do not independently authenticate the socket. A production hardening phase should authenticate Socket.IO connections and validate message ownership server-side.
- Profile images are stored as strings in MongoDB. Production deployments should enforce payload limits and move images to managed object storage if scale requires it.
- API and socket URLs are currently localhost values in the client. Deployment should make these configurable per environment.

## 8. Deployment view

For development, `npm run dev` starts the API and Vite client concurrently; `npm run desktop` also opens Electron after Vite is reachable. The API listens on port `5000` by default and Vite serves the client on port `5173` by default. A deployable environment needs a MongoDB instance, API runtime, client hosting, and matching CORS/Socket.IO `CLIENT_URL` configuration.
