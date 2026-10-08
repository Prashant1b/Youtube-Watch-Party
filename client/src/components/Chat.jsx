import { useState } from "react";
import { Send } from "lucide-react";

export function Chat({ messages, onSend }) {
  const [text, setText] = useState("");
  const submit = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <section className="panel chat">
      <h2>Chat</h2>
      <div className="messages">
        {messages.map((message) => (
          <div className="message" key={message.id}>
            <strong>{message.username}</strong>
            <p>{message.text}</p>
          </div>
        ))}
      </div>
      <div className="chat-form">
        <input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submit()} placeholder="Message the room" />
        <button className="icon-button" onClick={submit} title="Send"><Send size={18} /></button>
      </div>
    </section>
  );
}
