"use client";

export function AdminPanel({ users, currentId, onDisconnectUser }) {
  const otherUsers = users.filter((user) => user.id !== currentId);

  return (
    <section className="panel admin">
      <h3>root@system</h3>
      <table>
        <thead>
          <tr>
            <th>id</th>
            <th>handle</th>
            <th>pts</th>
            <th>cmd</th>
          </tr>
        </thead>
        <tbody>
          {otherUsers.map((user) => (
            <tr key={user.id}>
              <td>{user.avatar}</td>
              <td>{user.name}</td>
              <td>{user.score}</td>
              <td>
                <button
                  type="button"
                  className="kick"
                  onClick={() => onDisconnectUser(user.id)}
                >
                  Kill
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
