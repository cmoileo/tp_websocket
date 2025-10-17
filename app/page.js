"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const avatarChoices = [
  "🦊",
  "🐼",
  "🐧",
  "🐯",
  "🐸",
  "🦄",
  "🐙",
  "🐢",
  "🐝",
  "🐺",
  "🐰",
  "🐱",
  "🐶",
  "🐨",
  "🐵",
  "🐷",
];

export default function HomePage() {
  const [view, setView] = useState("landing");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(avatarChoices[0]);
  const [adminCode, setAdminCode] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [globalScore, setGlobalScore] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const chatRef = useRef(null);
  const privateRef = useRef(null);
  const wsRef = useRef(null);
  const heartbeatRef = useRef(null);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages]);

  useEffect(() => {
    if (privateRef.current)
      privateRef.current.scrollTop = privateRef.current.scrollHeight;
  }, [privateMessages]);

  const sortedTargets = useMemo(
    () => users.filter((user) => user.id !== currentId),
    [users, currentId]
  );

  function showLanding(message) {
    if (message) setError(message);
    setView("landing");
    setUsers([]);
    setGlobalScore(0);
    setIsAdmin(false);
    setCurrentId(null);
    setChatMessages([]);
    setPrivateMessages([]);
    stopHeartbeat();
  }

  function showDashboard() {
    setView("dashboard");
    setError("");
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatRef.current = setInterval(() => {
      send({ type: "ping" });
    }, 15000);
  }

  function stopHeartbeat() {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }

  function send(payload) {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify(payload));
  }

  function connect() {
    if (wsRef.current) {
      wsRef.current.removeEventListener("close", handleClose);
      wsRef.current.close();
    }
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsPath = process.env.NEXT_PUBLIC_WS_PATH || "/ws";
    const socket = new WebSocket(
      `${protocol}://${window.location.host}${wsPath}`
    );
    wsRef.current = socket;
    socket.addEventListener("open", () => {
      send({
        type: "join",
        payload: { name, avatar, adminCode: adminCode || null },
      });
    });
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("close", handleClose);
    socket.addEventListener("error", () =>
      showLanding("Connexion interrompue")
    );
  }

  function handleClose(event) {
    if (event?.code === 1000 && event?.reason === "admin_disconnect")
      showLanding("Déconnexion par l'administrateur");
    else showLanding("Connexion fermée");
  }

  function handleMessage(event) {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (err) {
      return;
    }
    const { type, payload } = data;
    if (type === "welcome") return;
    if (type === "join_success") {
      setCurrentId(payload.id);
      setUsers(payload.users);
      setGlobalScore(payload.globalScore);
      const self = payload.users.find((user) => user.id === payload.id);
      setIsAdmin(Boolean(self?.isAdmin));
      showDashboard();
      startHeartbeat();
      return;
    }
    if (type === "user_joined") {
      setUsers(payload.users);
      setGlobalScore(payload.globalScore);
      setChatMessages((prev) => [
        ...prev,
        {
          id: payload.id,
          label: `${payload.name} vient d'arriver`,
          text: `${payload.name} participe`,
          timestamp: Date.now(),
        },
      ]);
      return;
    }
    if (type === "user_left") {
      setUsers(payload.users);
      setGlobalScore(payload.globalScore);
      setChatMessages((prev) => [
        ...prev,
        {
          id: payload.id,
          label: "Départ",
          text: "Un utilisateur a quitté la session",
          timestamp: Date.now(),
        },
      ]);
      return;
    }
    if (type === "users_update") {
      setUsers(payload.users);
      return;
    }
    if (type === "score_update") {
      setGlobalScore(payload.globalScore);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === payload.id ? { ...user, score: payload.score } : user
        )
      );
      return;
    }
    if (type === "global_message") {
      setChatMessages((prev) => [
        ...prev,
        {
          id: payload.id,
          label: `${payload.from.avatar} ${payload.from.name}`,
          text: payload.text,
          timestamp: payload.timestamp,
        },
      ]);
      return;
    }
    if (type === "private_message") {
      const label =
        payload.from.id === currentId
          ? `À ${resolveUserName(payload.to)}`
          : `${payload.from.avatar} ${payload.from.name}`;
      setPrivateMessages((prev) => [
        ...prev,
        {
          id: payload.id,
          label,
          text: payload.text,
          timestamp: payload.timestamp,
        },
      ]);
      return;
    }
    if (type === "error") {
      setError(payload.message);
      return;
    }
  }

  function resolveUserName(targetId) {
    const user = users.find((entry) => entry.id === targetId);
    if (!user) return "Utilisateur";
    return `${user.avatar} ${user.name}`;
  }

  function submitJoin(event) {
    event.preventDefault();
    if (!name.trim() || !avatar.trim()) {
      setError("Nom et avatar requis");
      return;
    }
    setError("");
    connect();
  }

  function submitGlobal(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = data.get("message").toString().trim();
    if (!text) return;
    send({ type: "global_message", payload: { text } });
    event.currentTarget.reset();
  }

  function submitPrivate(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const message = data.get("message").toString().trim();
    const target = data.get("target").toString();
    if (!message || !target) return;
    send({
      type: "private_message",
      payload: { text: message, targetId: target },
    });
    event.currentTarget.reset();
  }

  function adjustScore(delta) {
    send({ type: "score_event", payload: { delta } });
  }

  function disconnect() {
    if (wsRef.current) wsRef.current.close();
    showLanding("Session quittée");
  }

  return (
    <div className="app-shell">
      {view === "landing" && (
        <section className="landing">
          <h1>Hub Temps Réel</h1>
          <form className="join-form" onSubmit={submitJoin}>
            <label htmlFor="join-name">Nom</label>
            <input
              id="join-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={24}
              required
            />
            <label>Avatar</label>
            <div className="avatar-grid">
              {avatarChoices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className={
                    choice === avatar ? "avatar-option active" : "avatar-option"
                  }
                  onClick={() => setAvatar(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
            <label htmlFor="join-admin">Code admin (facultatif)</label>
            <input
              id="join-admin"
              value={adminCode}
              onChange={(event) => setAdminCode(event.target.value)}
              maxLength={32}
            />
            <button type="submit">Rejoindre</button>
            {error && <p className="error-text">{error}</p>}
          </form>
        </section>
      )}

      {view === "dashboard" && (
        <section className="dashboard">
          <header className="topbar">
            <div className="identity">
              <span className="avatar-large">{avatar}</span>
              <div>
                <h2>{name}</h2>
                <p className="status-online">En ligne</p>
              </div>
            </div>
            <div className="score-summary">
              <strong>Score global</strong>
              <span>{globalScore}</span>
            </div>
            <button className="leave" onClick={disconnect}>
              Quitter
            </button>
          </header>
          <main className="grid">
            <section className="panel players">
              <h3>Participants</h3>
              <ul>
                {users.map((user) => (
                  <li key={user.id} className="player">
                    <span className="player-avatar">{user.avatar}</span>
                    <div className="player-info">
                      <span>{user.name}</span>
                      <span className="player-score">{user.score} pts</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <section className="panel chat">
              <div className="panel-header">
                <h3>Salon</h3>
                <div className="score-actions">
                  <button type="button" onClick={() => adjustScore(1)}>
                    +1 Action
                  </button>
                  <button type="button" onClick={() => adjustScore(-1)}>
                    -1 Action
                  </button>
                </div>
              </div>
              <div className="log" ref={chatRef}>
                {chatMessages.map((message) => (
                  <article key={message.id} className="message">
                    <div className="message-header">
                      <span>{message.label}</span>
                      <span>
                        {new Date(
                          message.timestamp || Date.now()
                        ).toLocaleTimeString()}
                      </span>
                    </div>
                    <p>{message.text}</p>
                  </article>
                ))}
              </div>
              <form className="form-inline" onSubmit={submitGlobal}>
                <input
                  name="message"
                  placeholder="Message global"
                  autoComplete="off"
                />
                <button type="submit">Envoyer</button>
              </form>
            </section>
            <section className="panel private">
              <h3>Privé</h3>
              <form className="form-inline" onSubmit={submitPrivate}>
                <select name="target">
                  <option value="">Choisir un destinataire</option>
                  {sortedTargets.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.avatar} {user.name}
                    </option>
                  ))}
                </select>
                <input
                  name="message"
                  placeholder="Message privé"
                  autoComplete="off"
                />
                <button type="submit">Envoyer</button>
              </form>
              <div className="log" ref={privateRef}>
                {privateMessages.map((entry) => (
                  <article key={entry.id} className="message">
                    <div className="message-header">
                      <span>{entry.label}</span>
                      <span>
                        {new Date(
                          entry.timestamp || Date.now()
                        ).toLocaleTimeString()}
                      </span>
                    </div>
                    <p>{entry.text}</p>
                  </article>
                ))}
              </div>
            </section>
            {isAdmin && (
              <section className="panel admin">
                <h3>Administration</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Avatar</th>
                      <th>Nom</th>
                      <th>Score</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter((user) => user.id !== currentId)
                      .map((user) => (
                        <tr key={user.id}>
                          <td>{user.avatar}</td>
                          <td>{user.name}</td>
                          <td>{user.score}</td>
                          <td>
                            <button
                              type="button"
                              className="kick"
                              onClick={() =>
                                send({
                                  type: "request_disconnect_user",
                                  payload: { targetId: user.id },
                                })
                              }
                            >
                              Déconnecter
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </section>
            )}
          </main>
        </section>
      )}
    </div>
  );
}
