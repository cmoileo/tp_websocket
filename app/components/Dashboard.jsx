"use client";

import { TopBar } from "./TopBar";
import { PlayerList } from "./PlayerList";
import { ChatPanel } from "./ChatPanel";
import { PrivatePanel } from "./PrivatePanel";
import { AdminPanel } from "./AdminPanel";

export function Dashboard({
  name,
  avatar,
  users,
  globalScore,
  currentId,
  isAdmin,
  chatMessages,
  privateMessages,
  onDisconnect,
  onSendGlobalMessage,
  onSendPrivateMessage,
  onAdjustScore,
  onDisconnectUser,
}) {
  return (
    <section className="dashboard">
      <TopBar
        name={name}
        avatar={avatar}
        globalScore={globalScore}
        onDisconnect={onDisconnect}
      />

      <main className="grid">
        <PlayerList users={users} />

        <ChatPanel
          messages={chatMessages}
          onSendMessage={onSendGlobalMessage}
          onAdjustScore={onAdjustScore}
        />

        <PrivatePanel
          messages={privateMessages}
          users={users}
          currentId={currentId}
          onSendMessage={onSendPrivateMessage}
        />

        {isAdmin && (
          <AdminPanel
            users={users}
            currentId={currentId}
            onDisconnectUser={onDisconnectUser}
          />
        )}
      </main>
    </section>
  );
}
