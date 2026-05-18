import { useEffect, useRef, useState } from "react";
import socket from "../socket/socket";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Chat() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messagesByUser, setMessagesByUser] = useState({});
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [notifications, setNotifications] = useState({});
  const [onlineUsersState, setOnlineUsersState] = useState({});
  const [userSearch, setUserSearch] = useState("");

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const selectedUserRef = useRef(null);

  let userInfo = { _id: null };

  try {
    userInfo = JSON.parse(localStorage.getItem("userInfo")) || { _id: null };
  } catch {
    localStorage.removeItem("userInfo");
  }

  const senderId = userInfo._id;
  const token = userInfo.token;
  const currentUserName = userInfo.name || "User";
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
      setUsersLoading(true);
      try {
        const res = await axios.get("http://localhost:5000/api/users", authHeaders);
        const filteredUsers = res.data.filter((user) => user._id !== senderId);
        setUsers(filteredUsers);
      } catch (error) {
        console.log(error);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, [senderId, token]);

  useEffect(() => {
    if (senderId) {
      socket.emit("join", senderId);
    }

    const handlePresenceUpdate = (onlineIds) => {
      // convert array of ids to map for O(1) checks
      const map = {};
      (onlineIds || []).forEach((id) => (map[id] = true));
      setOnlineUsersState(map);
    };

    const handleReceiveMessage = (data) => {
      const otherId = data.senderId === senderId ? data.receiverId : data.senderId;

      // append to that conversation
      setMessagesByUser((prev) => ({
        ...prev,
        [otherId]: [...(prev[otherId] || []), data],
      }));

      // if currently viewing that user, no notification; otherwise increment
      if (!(selectedUserRef.current && data.senderId === selectedUserRef.current._id)) {
        setNotifications((prev) => ({
          ...prev,
          [data.senderId]: (prev[data.senderId] || 0) + 1,
        }));
      }
    };

    socket.on("presence_update", handlePresenceUpdate);
    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("presence_update", handlePresenceUpdate);
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [senderId]);

  useEffect(() => {
    const authHeaders = token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined;

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
  }, [senderId, receiverId, token]);

  useEffect(() => {
    if (selectedUser) {
      messageInputRef.current?.focus();
    }
  }, [selectedUser]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    // auto-scroll to bottom when current conversation messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedUser, currentConvLength]);

  const formatTime = (msg) => {
    if (msg.time) return msg.time;
    if (msg.createdAt) return new Date(msg.createdAt).toLocaleTimeString();
    return new Date().toLocaleTimeString();
  };

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

  const handleLogout = () => {
    localStorage.removeItem("userInfo");
    navigate("/");
  };

  return (
    <div className="chat-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div>
            <div className="eyebrow">Chats</div>
            <h3>{currentUserName}</h3>
            <div className="sidebar-subtitle">You are logged in as</div>
          </div>
          <div className="sidebar-count">{users.filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase())).length}</div>
        </div>

        <input
          aria-label="Search users"
          className="user-search"
          placeholder="Search users..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
        />

        {usersLoading && (
          <div>
            <div className="user-skeleton" />
            <div className="user-skeleton" />
            <div className="user-skeleton" />
          </div>
        )}

        {!usersLoading && users.length === 0 && <p className="muted">No users available</p>}

        {users
          .filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase()))
          .map((user) => (
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
              <div className="user-row">
                <div className="avatar">
                  <span className="initials">{(user.name || "?").slice(0, 1)}</span>
                  <span className={`presence ${onlineUsersState[user._id] ? "online" : "offline"}`} />
                </div>
                <div className="user-meta">
                  <div className="user-name">{user.name}</div>
                </div>

                {notifications[user._id] > 0 && (
                  <span className="notify-badge">{notifications[user._id]}</span>
                )}
              </div>
            </div>
          ))}
      </aside>

      <main className="chat-window">
        <header className="chat-header">
          <div className="chat-header-row">
            <div>
              <div className="eyebrow">Signed in as</div>
              <h2>{currentUserName}</h2>
            </div>
            <button type="button" className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
          <div className="chat-subtitle">
            {selectedUser ? `Chatting with ${selectedUser.name}` : "Pick someone on the left to start the conversation"}
          </div>
        </header>

        <section className="messages" aria-live="polite">
          {!selectedUser && (
            <div className="empty-chat-state">
              <div className="empty-chat-title">No conversation selected</div>
              <div className="empty-chat-copy">Select a user from the sidebar to load the thread.</div>
            </div>
          )}

          {selectedUser && (messagesByUser[selectedUser._id] || []).length === 0 && (
            <div className="empty-chat-state">
              <div className="empty-chat-title">Say hello</div>
              <div className="empty-chat-copy">This conversation is empty. Send the first message.</div>
            </div>
          )}

          {(messagesByUser[selectedUser?._id] || []).map((msg, index) => {
            const isSent = msg.senderId === senderId;
            return (
              <div key={`${msg._id || index}-${index}`} className={`message ${isSent ? "sent" : "received"}`}>
                <div className="message-body">
                  <div className="message-text">{msg.text}</div>
                  <div className="message-meta">{formatTime(msg)}</div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </section>

        <div className="composer">
          <input
            ref={messageInputRef}
            type="text"
            placeholder={selectedUser ? `Message ${selectedUser.name}` : "Select a user to start chatting"}
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