import { useEffect, useRef, useState } from "react";
import socket from "../socket/socket";
import axios from "axios";

function Chat() {
  const [message, setMessage] = useState("");
  const [messagesByUser, setMessagesByUser] = useState({});
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [notifications, setNotifications] = useState({});
  const [onlineUsersState, setOnlineUsersState] = useState({});

  const messagesEndRef = useRef(null);

  let userInfo = { _id: null };

  try {
    userInfo = JSON.parse(localStorage.getItem("userInfo")) || { _id: null };
  } catch {
    localStorage.removeItem("userInfo");
  }

  const senderId = userInfo._id;
  const token = userInfo.token;
  const receiverId = selectedUser?._id;

  const currentConvLength = selectedUser ? (messagesByUser[selectedUser._id]?.length || 0) : 0;

  useEffect(() => {
    const authHeaders = token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined;

    const fetchUsers = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/users", authHeaders);
        const filteredUsers = res.data.filter((user) => user._id !== senderId);
        setUsers(filteredUsers);
      } catch (error) {
        console.log(error);
      }
    };

    fetchUsers();

    const fetchMessages = async () => {
      if (!senderId || !receiverId) return;
      try {
        const res = await axios.get(
          `http://localhost:5000/api/messages/${senderId}/${receiverId}`,
          authHeaders
        );
        // store messages under the other user's id
        setMessagesByUser((prev) => ({
          ...prev,
          [receiverId]: res.data || [],
        }));
      } catch (error) {
        console.log(error);
      }
    };

    fetchMessages();

    if (senderId) socket.emit("join", senderId);

    socket.on("presence_update", (onlineIds) => {
      // convert array of ids to map for O(1) checks
      const map = {};
      (onlineIds || []).forEach((id) => (map[id] = true));
      setOnlineUsersState(map);
    });

    socket.on("receive_message", (data) => {
      const otherId = data.senderId === senderId ? data.receiverId : data.senderId;

      // append to that conversation
      setMessagesByUser((prev) => ({
        ...prev,
        [otherId]: [...(prev[otherId] || []), data],
      }));

      // if currently viewing that user, no notification; otherwise increment
      if (!(selectedUser && data.senderId === selectedUser._id)) {
        setNotifications((prev) => ({
          ...prev,
          [data.senderId]: (prev[data.senderId] || 0) + 1,
        }));
      }
    });

    return () => {
      socket.off("receive_message");
      socket.off("presence_update");
    };
  }, [senderId, receiverId, selectedUser, token]);

  useEffect(() => {
    // auto-scroll to bottom when current conversation messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedUser, currentConvLength]);

  const sendMessage = () => {
    if (!message.trim() || !receiverId) return;

    const messageData = {
      senderId,
      receiverId,
      text: message,
    };

    socket.emit("send_message", messageData);

    // append locally to messagesByUser for receiver
    setMessagesByUser((prev) => ({
      ...prev,
      [receiverId]: [
        ...(prev[receiverId] || []),
        {
          ...messageData,
          time: new Date().toLocaleTimeString(),
        },
      ],
    }));

    setMessage("");
  };

  return (
    <div className="chat-container">
      <aside className="sidebar">
        <h3>Users</h3>

        {users.length === 0 && <p className="muted">No users available</p>}

        {users.map((user) => (
          <div
            key={user._id}
            role="button"
            tabIndex={0}
            onClick={() => {

              setSelectedUser(user);

              setNotifications((prev) => ({
                ...prev,
                [user._id]: 0,
              }));
            }}
            className={`user-item ${selectedUser?._id === user._id ? "selected" : ""}`}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >

              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  aria-hidden
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: onlineUsersState[user._id] ? "limegreen" : "#ccc",
                    display: "inline-block",
                  }}
                />
                <span>{user.name}</span>
              </span>

              {
                notifications[user._id] > 0 && (
                  <span
                    style={{
                      background: "red",
                      color: "white",
                      borderRadius: "50%",
                      padding: "4px 8px",
                      fontSize: "12px",
                    }}
                  >
                    {notifications[user._id]}
                  </span>
                )
              }

            </div>
          </div>
        ))}
      </aside>

      <main className="chat-window">
        <header className="chat-header">
          <h2>Private Chat</h2>
          <div className="chat-subtitle">
            {selectedUser ? `Chatting with: ${selectedUser.name}` : "Select a user to start"}
          </div>
        </header>

        <section className="messages" aria-live="polite">
          {(messagesByUser[selectedUser?._id] || []).map((msg, index) => {
            const isSent = msg.senderId === senderId;
            return (
              <div key={index} className={`message ${isSent ? "sent" : "received"}`}>
                <div className="message-body">
                  <div className="message-text">{msg.text}</div>
                  <div className="message-meta">{msg.time}</div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </section>

        <div className="composer">
          <input
            type="text"
            placeholder={selectedUser ? "Enter message" : "Select user to enable messaging"}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!selectedUser}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button className="send-btn" onClick={sendMessage} disabled={!message.trim() || !selectedUser}>
            Send
          </button>
        </div>
      </main>
    </div>
  );
}

export default Chat;