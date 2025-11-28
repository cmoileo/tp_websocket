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
    roomId,
    chatMessages,
    privateMessages,
    isConnected,
    error,
    roomsScoreboard,
    createRoom,
    joinRoom,
    disconnect,
    sendGlobalMessage,
    sendPrivateMessage,
    adjustScore,
    disconnectUser,
    clearError,
  } = useWebSocket();

  const handleCreateRoom = (adminCode, name, avatar) => {
    if (!name.trim() || !avatar.trim() || !adminCode.trim()) return;
    setCredentials({ name, avatar });
    createRoom(adminCode, name, avatar);
  };

  const handleJoinRoom = (roomId, name, avatar, adminCode) => {
    if (!name.trim() || !avatar.trim() || !roomId.trim()) return;
    setCredentials({ name, avatar });
    joinRoom(roomId, name, avatar, adminCode);
  };

  return (
    <div className="app-shell">
      {!isConnected ? (
        <JoinForm
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          error={error}
          onClearError={clearError}
          roomsScoreboard={roomsScoreboard}
        />
      ) : (
        <Dashboard
          name={credentials.name}
          avatar={credentials.avatar}
          users={users}
          globalScore={globalScore}
          currentId={currentId}
          roomId={roomId}
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
