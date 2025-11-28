"use client";

import { useMemo } from "react";
import { MessageLog } from "./MessageLog";

export function PrivatePanel({ messages, users, currentId, onSendMessage }) {
  const availableTargets = useMemo(
    () => users.filter((user) => user.id !== currentId),
    [users, currentId]
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const text = formData.get("message").toString().trim();
    const targetId = formData.get("target").toString();

    if (text && targetId) {
      onSendMessage(text, targetId);
      event.currentTarget.reset();
    }
  };

  return (
    <section className="panel private">
      <h3>#private</h3>

      <form className="form-inline" onSubmit={handleSubmit}>
        <select name="target">
          <option value="">select target...</option>
          {availableTargets.map((user) => (
            <option key={user.id} value={user.id}>
              {user.avatar} {user.name}
            </option>
          ))}
        </select>
        <input name="message" placeholder="> whisper..." autoComplete="off" />
        <button type="submit">Send</button>
      </form>

      <MessageLog messages={messages} />
    </section>
  );
}
