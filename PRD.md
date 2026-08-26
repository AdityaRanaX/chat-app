# Product Requirements Document (PRD)

## 1. Product overview

**Chat App** is a real-time, one-to-one messaging application. It lets people create an account, sign in, discover other registered users, exchange messages instantly, see presence status, and maintain a basic profile. The application is available in the browser and can be launched in an Electron desktop window during development.

## 2. Problem statement

People need a simple private communication experience that does not require manually refreshing a page to see new messages. The product provides an authenticated user directory and persistent direct-message history with real-time delivery.

## 3. Goals

- Allow a new user to register and an existing user to log in securely.
- Show authenticated users a searchable list of other users.
- Enable persistent one-to-one conversations.
- Deliver new messages and presence changes in real time.
- Allow users to update their display name and profile picture.
- Provide light and dark theme preferences.

## 4. Target users

- **New user:** creates an account and signs in for the first time.
- **Authenticated user:** finds another registered user, reads conversation history, and sends messages.
- **Profile owner:** changes the display name or profile picture and expects that change to appear in the interface.

## 5. Functional requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| FR-01 | Registration | A user can register with name, email, password, age, and phone number. Required-field, invalid-age, and duplicate-email errors are rejected. |
| FR-02 | Authentication | A registered user can log in with email and password. Successful login returns a JWT and user profile data. |
| FR-03 | Protected chat | Unauthenticated visitors are redirected to the login page before they can open `/chat`. Protected API endpoints require a Bearer token. |
| FR-04 | User directory | An authenticated user can view all other registered users and filter them by name. Password hashes are never returned. |
| FR-05 | Conversation history | Selecting a user loads all persisted messages exchanged by the two users in chronological order. |
| FR-06 | Real-time messages | Sending a non-empty message persists it and immediately delivers it to an online recipient. The sender sees the message without waiting for a reload. |
| FR-07 | Presence | A connected user is shown as online. User connections and disconnections update presence for connected clients. |
| FR-08 | Notifications | Incoming messages for a conversation that is not open increment an unread counter. Opening that conversation clears its counter. |
| FR-09 | Profile management | A logged-in user can change display name and profile picture. The selected picture may be cropped before it is saved. |
| FR-10 | Preferences | A user can switch between light and dark themes. The selected theme is retained in browser local storage. |
| FR-11 | Sign out | A user can sign out, which clears local session data and returns them to the registration route. |

## 6. User journeys

### Register and sign in

1. The visitor opens the application and completes the registration form.
2. The server validates the input, hashes the password, and creates the account.
3. The user is taken to login with a registration-success message.
4. After successful login, user profile data and the JWT are stored locally and the user is routed to the chat screen.

### Send a direct message

1. The user selects a person from the searchable sidebar.
2. The client retrieves existing messages for the pair.
3. The user enters a message and sends it.
4. The server stores the message in MongoDB and emits it to the recipient if they are connected.
5. Both participants see the new message in the conversation; an inactive recipient conversation receives an unread count.

### Update a profile

1. The user opens **Edit profile**.
2. They update their display name and optionally choose and crop a picture.
3. The client sends the authenticated profile update request.
4. The server saves the changes and returns an updated user payload.
5. The client updates local session data and broadcasts the profile update to connected clients.

## 7. Non-functional requirements

- **Usability:** The chat screen must clearly distinguish selected, online, offline, sent, and received states.
- **Responsiveness:** Messages for online users should appear through Socket.IO without a manual refresh.
- **Persistence:** Accounts, profiles, and messages must survive server restarts through MongoDB.
- **Security:** Passwords must be hashed with bcrypt; protected HTTP APIs must validate a JWT; client-side route protection must not be the only access control.
- **Compatibility:** The client runs in modern browsers and in the Electron development wrapper.
- **Reliability:** HTTP request failures should not prevent later requests or real-time events from being processed.

## 8. Scope and exclusions

### In scope

- One-to-one text messaging
- Account registration and login
- User search, profile picture, display-name edit, presence, unread counters, and theme preference

### Out of scope for the current version

- Group chats, attachments, typing indicators, message edits/deletes, read receipts, password reset, and push notifications
- Server-side image storage or file-size/type enforcement beyond the client-side image picker
- Multi-device presence tracking for more than one active socket per user

## 9. Success measures

- A new user can register, log in, and reach the chat screen successfully.
- An authenticated user can retrieve a conversation history and send a persisted message.
- An online recipient receives a sent message without a page refresh.
- A profile and theme change remains visible during the current client session and theme persists on the next load.

## 10. Assumptions and dependencies

- MongoDB is available through the `MONGO_URI` environment variable.
- JWT signing is configured through `JWT_SECRET`.
- The browser client and server use the local development URLs configured in the source (`localhost:5173` and `localhost:5000`).
- Production hosting must set `CLIENT_URL` when Socket.IO uses the production origin configuration.
