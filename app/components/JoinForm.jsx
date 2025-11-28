"use client";

import { useState } from "react";
import { AVATAR_CHOICES } from "../constants/avatars";
import { AvatarGrid } from "./AvatarGrid";

function RoomsScoreboard({ rooms, onSelectRoom }) {
  if (!rooms || rooms.length === 0) {
    return (
      <div className="scoreboard">
        <h3>Active Rooms</h3>
        <p className="scoreboard-empty">No active rooms</p>
      </div>
    );
  }

  const sortedRooms = [...rooms].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="scoreboard">
      <h3>Active Rooms</h3>
      <ul className="scoreboard-list">
        {sortedRooms.map((room, index) => (
          <li
            key={room.id}
            className="scoreboard-item"
            onClick={() => onSelectRoom && onSelectRoom(room.id)}
          >
            <span className="scoreboard-rank">#{index + 1}</span>
            <span className="scoreboard-id">{room.id}</span>
            <span className="scoreboard-players">
              {room.playerCount} player{room.playerCount !== 1 ? "s" : ""}
            </span>
            <span className="scoreboard-score">{room.totalScore} pts</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function JoinForm({
  onCreateRoom,
  onJoinRoom,
  error,
  onClearError,
  roomsScoreboard,
}) {
  const [mode, setMode] = useState("menu");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_CHOICES[0]);
  const [adminCode, setAdminCode] = useState("");
  const [roomId, setRoomId] = useState("");

  const handleCreateRoom = (event) => {
    event.preventDefault();
    if (!name.trim() || !avatar.trim() || !adminCode.trim()) return;
    onCreateRoom(adminCode, name, avatar);
  };

  const handleJoinRoom = (event) => {
    event.preventDefault();
    if (!name.trim() || !avatar.trim() || !roomId.trim()) return;
    onJoinRoom(roomId, name, avatar, adminCode);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    if (onClearError) onClearError();
  };

  const handleSelectRoom = (selectedRoomId) => {
    setRoomId(selectedRoomId);
    switchMode("join");
  };

  if (mode === "menu") {
    return (
      <section className="landing">
        <h1>Terminal IRC</h1>
        <div className="menu-buttons">
          <button type="button" onClick={() => switchMode("create")}>
            Create Room
          </button>
          <button type="button" onClick={() => switchMode("join")}>
            Join Room
          </button>
        </div>
        <RoomsScoreboard
          rooms={roomsScoreboard}
          onSelectRoom={handleSelectRoom}
        />
      </section>
    );
  }

  if (mode === "create") {
    return (
      <section className="landing">
        <h1>Create Room</h1>
        <form className="join-form" onSubmit={handleCreateRoom}>
          <label htmlFor="create-name">handle</label>
          <input
            id="create-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            required
            placeholder="anonymous"
          />

          <label>identity</label>
          <AvatarGrid selectedAvatar={avatar} onSelect={setAvatar} />

          <label htmlFor="create-admin">admin password</label>
          <input
            id="create-admin"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            maxLength={32}
            minLength={3}
            required
            placeholder="min 3 chars"
            type="password"
          />

          <div className="form-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => switchMode("menu")}
            >
              Back
            </button>
            <button type="submit">Create</button>
          </div>
          {error && <p className="error-text">{error}</p>}
        </form>
      </section>
    );
  }

  return (
    <section className="landing">
      <h1>Join Room</h1>
      <form className="join-form" onSubmit={handleJoinRoom}>
        <label htmlFor="join-room">room id</label>
        <input
          id="join-room"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value.toUpperCase())}
          maxLength={6}
          required
          placeholder="XXXXXX"
        />

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

        <label htmlFor="join-admin">admin password (optional)</label>
        <input
          id="join-admin"
          value={adminCode}
          onChange={(e) => setAdminCode(e.target.value)}
          maxLength={32}
          placeholder="********"
          type="password"
        />

        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => switchMode("menu")}
          >
            Back
          </button>
          <button type="submit">Connect</button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </form>
    </section>
  );
}
