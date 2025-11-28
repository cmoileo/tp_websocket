"use client";

import { useState } from "react";
import { AVATAR_CHOICES } from "../constants/avatars";
import { AvatarGrid } from "./AvatarGrid";

export function JoinForm({ onSubmit, error }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_CHOICES[0]);
  const [adminCode, setAdminCode] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ name, avatar, adminCode });
  };

  return (
    <section className="landing">
      <h1>Terminal IRC</h1>
      <form className="join-form" onSubmit={handleSubmit}>
        <label htmlFor="join-name">handle</label>
        <input
          id="join-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          required
          placeholder="anonymous"
        />

        <label>identity</label>
        <AvatarGrid selectedAvatar={avatar} onSelect={setAvatar} />

        <label htmlFor="join-admin">root access</label>
        <input
          id="join-admin"
          value={adminCode}
          onChange={(e) => setAdminCode(e.target.value)}
          maxLength={32}
          placeholder="********"
          type="password"
        />

        <button type="submit">Connect</button>
        {error && <p className="error-text">{error}</p>}
      </form>
    </section>
  );
}
