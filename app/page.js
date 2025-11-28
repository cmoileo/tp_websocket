"use client";

import { useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { JoinForm, Dashboard } from "./components";

export default function HomePage() {
  const [credentials, setCredentials] = useState({ name: "", avatar: "" });

  const {
    users,
    globalScore,
    isAdmin,
    currentId,
    chatMessages,
    privateMessages,
    isConnected,
    error,
    connect,
    disconnect,
    sendGlobalMessage,
    sendPrivateMessage,
    adjustScore,
    disconnectUser,
  } = useWebSocket();

  const handleJoin = ({ name, avatar, adminCode }) => {
    if (!name.trim() || !avatar.trim()) return;
    setCredentials({ name, avatar });
    connect(name, avatar, adminCode);
  };

  return (
    <div className="app-shell">
      {!isConnected ? (
        <JoinForm onSubmit={handleJoin} error={error} />
      ) : (
        <Dashboard
          name={credentials.name}
          avatar={credentials.avatar}
          users={users}
          globalScore={globalScore}
          currentId={currentId}
          isAdmin={isAdmin}
          chatMessages={chatMessages}
          privateMessages={privateMessages}
          onDisconnect={disconnect}
          onSendGlobalMessage={sendGlobalMessage}
          onSendPrivateMessage={sendPrivateMessage}
          onAdjustScore={adjustScore}
          onDisconnectUser={disconnectUser}
        />
      )}
    </div>
  );
}
