import { useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import socket from "../socket/socket";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const getStoredUserInfo = () => {
  try {
    return JSON.parse(localStorage.getItem("userInfo")) || { _id: null };
  } catch {
    localStorage.removeItem("userInfo");
    return { _id: null };
  }
};

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

const getCroppedImage = async (imageSrc, cropPixels) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create canvas context");
  }

  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;

  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  return canvas.toDataURL("image/jpeg", 0.92);
};

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
  const [currentUser, setCurrentUser] = useState(getStoredUserInfo);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsForm, setSettingsForm] = useState({
    profilePic: "",
  });
  const [theme, setTheme] = useState(() => localStorage.getItem("chatTheme") || "dark");
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const selectedUserRef = useRef(null);
  const profileFileInputRef = useRef(null);

  const senderId = currentUser._id;
  const token = currentUser.token;
  const currentUserName = currentUser.name || "User";
  const currentUserAvatar = currentUser.profilePic || "";
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
    socket.on("profile_updated", (updatedUser) => {
      if (!updatedUser?._id) return;

      setUsers((prevUsers) =>
        prevUsers.map((user) => (user._id === updatedUser._id ? { ...user, ...updatedUser } : user))
      );

      setCurrentUser((prevUser) =>
        prevUser._id === updatedUser._id ? { ...prevUser, ...updatedUser } : prevUser
      );

      if (updatedUser._id === senderId) {
        localStorage.setItem("userInfo", JSON.stringify(updatedUser));
      }
    });

    return () => {
      socket.off("presence_update", handlePresenceUpdate);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("profile_updated");
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

  const openSettings = () => {
    setSettingsForm({
      profilePic: currentUser.profilePic || "",
    });
    setSettingsError("");
    setSettingsOpen(true);
  };

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("chatTheme", theme);
  }, [theme]);

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

  const handleThemeToggle = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  const handleProfileFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result || "");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const handleApplyCrop = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;

    const croppedImage = await getCroppedImage(cropImageSrc, croppedAreaPixels);

    setSettingsForm((prev) => ({
      ...prev,
      profilePic: croppedImage,
    }));

    setCropOpen(false);
    setCropImageSrc("");
  };

  const handleRemovePhoto = () => {
    setSettingsForm((prev) => ({
      ...prev,
      profilePic: "",
    }));
  };

  const handleSaveSettings = async () => {
    const authHeaders = token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined;

    setProfileSaving(true);
    setSettingsError("");

    try {
      const res = await axios.put(
        "http://localhost:5000/api/users/profile",
        {
          profilePic: settingsForm.profilePic,
        },
        authHeaders
      );

      const updatedUser = {
        ...currentUser,
        ...res.data,
      };

      setCurrentUser(updatedUser);
      localStorage.setItem("userInfo", JSON.stringify(updatedUser));
      socket.emit("profile_updated", updatedUser);
      setSettingsOpen(false);
    } catch (error) {
      setSettingsError(error?.response?.data?.message || "Unable to save settings");
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="chat-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div>
            <div className="eyebrow">Chats</div>
            <div className="sidebar-profile">
              {currentUserAvatar ? (
                <img src={currentUserAvatar} alt={currentUserName} className="sidebar-profile-pic" />
              ) : (
                <div className="sidebar-profile-fallback">{(currentUserName || "?").slice(0, 1)}</div>
              )}
              <div>
                <h3>{currentUserName}</h3>
                <div className="sidebar-subtitle">You are logged in as</div>
              </div>
            </div>
          </div>
          <button type="button" className="sidebar-settings-chip" onClick={openSettings}>
            Settings
          </button>
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
              <div className="chat-user-row">
                {currentUserAvatar ? (
                  <img src={currentUserAvatar} alt={currentUserName} className="chat-avatar" />
                ) : (
                  <div className="chat-avatar chat-avatar-fallback">{(currentUserName || "?").slice(0, 1)}</div>
                )}
                <h2>{currentUserName}</h2>
              </div>
            </div>
            <div className="header-actions">
              <button type="button" className="settings-btn" onClick={openSettings}>
                Settings
              </button>
              <button type="button" className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
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

      {settingsOpen && (
        <div className="settings-overlay" role="presentation" onClick={() => setSettingsOpen(false)}>
          <div className="settings-modal" role="dialog" aria-modal="true" aria-label="Settings" onClick={(event) => event.stopPropagation()}>
            <div className="settings-header">
              <div>
                <div className="eyebrow">Preferences</div>
                <h3>Settings</h3>
              </div>
              <button type="button" className="settings-close" onClick={() => setSettingsOpen(false)}>
                ×
              </button>
            </div>

            <div className="settings-section">
              <div className="settings-label">Profile picture</div>
              <div className="settings-avatar-row">
                {settingsForm.profilePic ? (
                  <img src={settingsForm.profilePic} alt="Profile preview" className="settings-avatar" />
                ) : (
                  <div className="settings-avatar settings-avatar-fallback">{(currentUserName || "?").slice(0, 1)}</div>
                )}
                <div className="settings-actions">
                  <button type="button" className="settings-secondary-btn" onClick={() => profileFileInputRef.current?.click()}>
                    Change photo
                  </button>
                  <input
                    ref={profileFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden-file-input"
                    onChange={handleProfileFileChange}
                  />
                  <div className="settings-help">Crop your photo before saving. The final image is stored in the database.</div>
                  {settingsForm.profilePic && (
                    <button type="button" className="settings-link-btn" onClick={handleRemovePhoto}>
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-label">Theme</div>
              <button type="button" className="theme-toggle" onClick={handleThemeToggle}>
                <span>{theme === "dark" ? "Dark mode on" : "Light mode on"}</span>
                <span className="theme-pill">{theme === "dark" ? "Dark" : "Light"}</span>
              </button>
            </div>

            {settingsError && <div className="settings-error">{settingsError}</div>}

            <div className="settings-footer">
              <button type="button" className="settings-secondary-btn" onClick={() => setSettingsOpen(false)}>
                Cancel
              </button>
              <button type="button" className="settings-save-btn" onClick={handleSaveSettings} disabled={profileSaving}>
                {profileSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {cropOpen && (
        <div className="settings-overlay crop-overlay" role="presentation" onClick={() => setCropOpen(false)}>
          <div className="settings-modal crop-modal" role="dialog" aria-modal="true" aria-label="Crop image" onClick={(event) => event.stopPropagation()}>
            <div className="settings-header">
              <div>
                <div className="eyebrow">Crop photo</div>
                <h3>Adjust your profile picture</h3>
              </div>
              <button type="button" className="settings-close" onClick={() => setCropOpen(false)}>
                ×
              </button>
            </div>

            <div className="crop-stage">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            </div>

            <label className="zoom-control">
              <span>Zoom</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              />
            </label>

            <div className="settings-footer">
              <button type="button" className="settings-secondary-btn" onClick={() => setCropOpen(false)}>
                Cancel
              </button>
              <button type="button" className="settings-save-btn" onClick={handleApplyCrop}>
                Apply crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;