"use client";

export function TopBar({ name, avatar, roomId, globalScore, onDisconnect }) {
  return (
    <header className="topbar">
      <div className="identity">
        <span className="avatar-large">{avatar}</span>
        <div>
          <h2>{name}</h2>
          <p className="status-online">connected</p>
        </div>
      </div>

      <div className="room-info">
        <strong>room</strong>
        <span className="room-id">{roomId}</span>
      </div>

      <div className="score-summary">
        <strong>global_score</strong>
        <span>{globalScore}</span>
      </div>

      <button className="leave" onClick={onDisconnect}>
        Disconnect
      </button>
    </header>
  );
}
