"use client";

export function PlayerList({ users }) {
  return (
    <section className="panel players">
      <h3>users online</h3>
      <ul>
        {users.map((user) => (
          <li key={user.id} className="player">
            <span className="player-avatar">{user.avatar}</span>
            <div className="player-info">
              <span>{user.name}</span>
              <span className="player-score">{user.score}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
