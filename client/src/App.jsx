import { useEffect, useState } from "react";
import socket from "./socket/socket";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const senderId = "user1";
  const receiverId = "user2";
  

  useEffect(() => {
    socket.emit("join", senderId);

    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;

    const messageData = {
      senderId,
      receiverId,
      text: message,
    };

    socket.emit("send_message", messageData);

    setMessages((prev) => [
      ...prev,
      {
        ...messageData,
        time: new Date().toLocaleTimeString(),
      },
    ]);

    setMessage("");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Private Chat</h1>

      <div
        style={{
          border: "1px solid gray",
          height: "300px",
          overflowY: "scroll",
          padding: "10px",
          marginBottom: "10px",
        }}
      >
        {messages.map((msg, index) => (
          <div key={index}>
            <p>
              <strong>{msg.senderId}</strong>
            </p>

            <p>{msg.text}</p>

            <small>{msg.time}</small>

            <hr />
          </div>
        ))}
      </div>

      <input
        type="text"
        placeholder="Enter message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button onClick={sendMessage}>
        Send
      </button>
    </div>
  );
}

export default App;