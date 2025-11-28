"use client";

import { MessageLog } from "./MessageLog";

export function ChatPanel({ messages, onSendMessage, onAdjustScore }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const text = formData.get("message").toString().trim();
    if (text) {
      onSendMessage(text);
      event.currentTarget.reset();
    }
  };

  return (
    <section className="panel chat">
      <div className="panel-header">
        <h3>#general</h3>
        <div className="score-actions">
          <button type="button" onClick={() => onAdjustScore(1)}>
            ++
          </button>
          <button type="button" onClick={() => onAdjustScore(-1)}>
            --
          </button>
        </div>
      </div>

      <MessageLog messages={messages} />

      <form className="form-inline" onSubmit={handleSubmit}>
        <input name="message" placeholder="> broadcast..." autoComplete="off" />
        <button type="submit">Send</button>
      </form>
    </section>
  );
}
