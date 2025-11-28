"use client";

import { useEffect, useRef } from "react";

function formatTime(timestamp) {
  return new Date(timestamp || Date.now()).toLocaleTimeString();
}

export function MessageLog({ messages }) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="log" ref={logRef}>
      {messages.map((message) => (
        <article key={message.id} className="message">
          <div className="message-header">
            <span>{message.label}</span>
            <span>{formatTime(message.timestamp)}</span>
          </div>
          <p>{message.text}</p>
        </article>
      ))}
    </div>
  );
}
