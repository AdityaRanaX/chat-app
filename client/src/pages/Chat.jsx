import { useEffect, useState } from "react";
import socket from "../socket/socket";
import axios from "axios";

function Chat() {

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  const senderId = userInfo._id;
  const receiverId = "TEMP_USER_ID";

  useEffect(() => {

    const fetchMessages = async () => {

      try {

        const res = await axios.get(
          `http://localhost:5000/api/messages/${senderId}/${receiverId}`
        );

        setMessages(res.data);

      } catch (error) {
        console.log(error);
      }
    };

    fetchMessages();

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

export default Chat;