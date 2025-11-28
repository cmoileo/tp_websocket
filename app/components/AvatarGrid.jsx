"use client";

import { AVATAR_CHOICES } from "../constants/avatars";

export function AvatarGrid({ selectedAvatar, onSelect }) {
  return (
    <div className="avatar-grid">
      {AVATAR_CHOICES.map((avatar) => (
        <button
          key={avatar}
          type="button"
          className={`avatar-option ${avatar === selectedAvatar ? "active" : ""}`}
          onClick={() => onSelect(avatar)}
        >
          {avatar}
        </button>
      ))}
    </div>
  );
}
