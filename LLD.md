# Low-Level Design (LLD)

## 1. Repository layout

```text
chat-app/
├── client/
│   └── src/
│       ├── pages/          # Register, Login, Chat, NotFound
│       ├── socket/         # Socket.IO client singleton
│       ├── App.jsx         # Route definitions and route guard
│       └── index.css       # Application styling and themes
├── server/
│   ├── config/db.js        # MongoDB connection
│   ├── controllers/        # Request handlers
│   ├── middleware/         # JWT authentication middleware
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express routers
│   ├── utils/              # JWT token generation
│   └── server.js           # HTTP and Socket.IO bootstrap
├── electron/main.js         # Desktop process and window lifecycle
└── package.json             # Root development scripts
```

## 2. API contract

### Authentication endpoints

| Method and route | Auth | Request body | Successful response |
| --- | --- | --- | --- |
| `POST /api/auth/register` | No | `name`, `email`, `password`, `age`, `phone` | `201` with account data and JWT. |
| `POST /api/auth/login` | No | `email`, `password` | `200` with account data and JWT. |
| `GET /api/auth/me` | Bearer JWT | None | `200` with the authenticated user document (without password). |

Registration returns `400` when required fields are missing, age is invalid, or the email exists. Login returns `400` for missing or invalid credentials.

### User endpoints

| Method and route | Auth | Request body | Successful response |
| --- | --- | --- | --- |
| `GET /api/users` | Bearer JWT | None | `200` with user list excluding password hashes. |
| `PUT /api/users/profile` | Bearer JWT | Optional `name`, `age`, `phone`, `profilePic` | `200` with updated account data and a fresh JWT. |

### Message endpoint

| Method and route | Auth | Path parameters | Successful response |
| --- | --- | --- | --- |
| `GET /api/messages/:senderId/:receiverId` | Bearer JWT | Two user IDs | `200` with all messages between the IDs, ordered by `createdAt` ascending. |

On server/controller failures, route handlers return `500` with a message. JWT middleware returns `401` for an absent, invalid, or expired token.

## 3. Data schema detail

### `User`

```js
{
  name: String,       // required
  email: String,      // required, unique
  password: String,   // required bcrypt hash
  age: Number,        // required
  phone: String,      // required
  profilePic: String, // defaults to ""
  createdAt: Date,
  updatedAt: Date
}
```

### `Message`

```js
{
  senderId: String,   // required
  receiverId: String, // required
  text: String,       // required
  createdAt: Date,
  updatedAt: Date
}
```

The current implementation stores participant IDs as strings rather than Mongoose `ObjectId` references. Conversation history uses an `$or` query to match both sender/receiver directions.

## 4. Authentication mechanics

1. `registerUser` validates required inputs and converts `age` to a number.
2. It checks the email, creates a bcrypt salt with 10 rounds, hashes the password, and saves the user.
3. `loginUser` loads the user by email and verifies the submitted password with bcrypt.
4. `generateToken` signs the user ID with `JWT_SECRET`.
5. The client stores the response as `localStorage.userInfo`.
6. Axios callers construct `Authorization: Bearer <token>` for protected requests.
7. `protect` verifies the token, loads the user without their password, and places it on `req.user`.

`ProtectedRoute` in the React application is a user-experience guard. It checks for valid local JSON but does not replace server JWT validation.

## 5. Client state and behaviour

`Chat.jsx` owns the following notable state:

| State | Purpose |
| --- | --- |
| `currentUser` | The logged-in profile and token read from local storage. |
| `users` | Registered users excluding the logged-in user. |
| `selectedUser` | The active direct-message partner. |
| `messagesByUser` | Cache of conversations keyed by the other user's ID. |
| `notifications` | Unread message count keyed by sender ID. |
| `onlineUsersState` | ID-to-boolean map derived from `presence_update`. |
| `theme` | `dark` or `light`, persisted in `chatTheme` local storage. |
| `settingsForm` | Editable name and image data for the profile dialog. |

Lifecycle behaviour:

- On identity change, the client obtains the user list and emits `join`.
- On selecting a user, it calls the conversation endpoint and focuses the message input.
- On `receive_message`, it appends to that user's cached conversation and increments unread count if the conversation is not active.
- On `profile_updated`, it updates the visible user list and local user session when relevant.
- On unmount or dependency changes, it removes registered socket listeners.

## 6. Socket.IO implementation detail

The server uses an object named `onlineUsers` where the key is a user ID and the value is a socket ID.

```text
join(userId)
  onlineUsers[userId] = socket.id
  broadcast presence_update(Object.keys(onlineUsers)) when changed

send_message({ senderId, receiverId, text })
  create Message in MongoDB
  if onlineUsers[receiverId] exists:
    emit receive_message(newMessage) to receiver socket

disconnect
  remove entries whose value equals disconnected socket.id
  broadcast presence update when changed
```

`profile_updated` is broadcast to all connected sockets. The sender passes the updated profile payload after receiving the successful HTTP response.

## 7. Profile-image flow

1. The user selects an `image/*` file in the profile dialog.
2. `FileReader` converts it to a data URL.
3. `react-easy-crop` captures the selected square crop region and zoom.
4. A canvas draws that region and converts it to JPEG data URL form.
5. The data URL is submitted as `profilePic` in `PUT /api/users/profile`.
6. MongoDB stores the string in the User document and clients render it as the avatar source.

## 8. Electron detail

`electron/main.js` builds a secure renderer window with `contextIsolation: true` and `nodeIntegration: false`. In development it loads `http://localhost:5173`; when packaged it loads `client/dist/index.html`. It changes window dimensions based on whether the active client route is `/chat` or an authentication route.

## 9. Configuration and runbook

Required server environment variables:

```env
MONGO_URI=<MongoDB connection string>
JWT_SECRET=<strong signing secret>
PORT=5000
NODE_ENV=development
CLIENT_URL=<client origin used in production>
```

Common commands from the repository root:

| Command | Result |
| --- | --- |
| `npm run server` | Starts the Express/Socket.IO server. |
| `npm run client` | Starts the Vite client. |
| `npm run dev` | Starts both server and client. |
| `npm run desktop` | Starts server, client, waits for Vite, then opens Electron. |
| `cd client; npm run build` | Creates the client production bundle. |

## 10. Known technical constraints

- Socket connection and messages are not authenticated at the Socket.IO handshake layer.
- Message read state and notification counts are client-local rather than persisted.
- A new connection for the same user replaces the prior socket ID in the in-memory presence map.
- The message endpoint accepts arbitrary path IDs after token validation; a stronger authorization rule should ensure the requester is one of the two participants.
- URLs are hard-coded to localhost in the current client source.
