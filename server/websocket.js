const { WebSocketServer } = require("ws");
const { v4: uuid } = require("uuid");

const rooms = new Map();
const clients = new Map();

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createRoom(adminCode) {
  const roomId = generateRoomId();
  rooms.set(roomId, {
    id: roomId,
    adminCode,
    clients: new Map(),
    createdAt: Date.now(),
  });
  return roomId;
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function getRoomPublicState(roomId) {
  const room = getRoom(roomId);
  if (!room) return [];

  return Array.from(room.clients.values())
    .filter((client) => client.joined)
    .map(({ id, name, avatar, score, isAdmin }) => ({
      id,
      name,
      avatar,
      score,
      isAdmin,
    }));
}

function getRoomGlobalScore(roomId) {
  return getRoomPublicState(roomId).reduce(
    (total, client) => total + client.score,
    0
  );
}

function getRoomsScoreboard() {
  return Array.from(rooms.values()).map((room) => ({
    id: room.id,
    playerCount: Array.from(room.clients.values()).filter((c) => c.joined)
      .length,
    totalScore: getRoomGlobalScore(room.id),
    createdAt: room.createdAt,
  }));
}

function broadcastScoreboard() {
  const scoreboard = getRoomsScoreboard();
  clients.forEach((client) => {
    if (!client.joined) {
      sendToClient(client.id, "rooms_scoreboard", { rooms: scoreboard });
    }
  });
}

function sendToClient(clientId, type, payload) {
  const client = clients.get(clientId);
  if (!client) return;

  try {
    client.ws.send(JSON.stringify({ type, payload }));
  } catch {
    client.ws.terminate();
  }
}

function broadcastToRoom(roomId, type, payload, excludeId) {
  const room = getRoom(roomId);
  if (!room) return;

  const message = JSON.stringify({ type, payload });

  room.clients.forEach((client) => {
    if (!client.joined || (excludeId && client.id === excludeId)) return;

    try {
      client.ws.send(message);
    } catch {
      client.ws.terminate();
    }
  });
}

function disconnectClient(clientId, reason = "admin_disconnect") {
  const client = clients.get(clientId);
  if (!client) return;

  try {
    client.ws.close(1000, reason);
  } catch {}
}

function handleCreateRoom(client, payload) {
  const adminCode = payload?.adminCode?.toString().trim();

  if (!adminCode || adminCode.length < 3) {
    sendToClient(client.id, "error", {
      message: "Admin code required (min 3 chars)",
    });
    return;
  }

  const roomId = createRoom(adminCode);

  sendToClient(client.id, "room_created", { roomId });
  broadcastScoreboard();
}

function handleJoin(client, payload) {
  if (client.joined) {
    sendToClient(client.id, "error", { message: "Already connected" });
    return;
  }

  const roomId = payload?.roomId?.toString().trim().toUpperCase();
  const name = payload?.name?.toString().trim();
  const avatar = payload?.avatar?.toString().trim();
  const adminCode = payload?.adminCode?.toString().trim();

  if (!roomId) {
    sendToClient(client.id, "error", { message: "Room ID required" });
    return;
  }

  const room = getRoom(roomId);

  if (!room) {
    sendToClient(client.id, "error", { message: "Room not found" });
    return;
  }

  if (!name || name.length > 24 || !avatar) {
    sendToClient(client.id, "error", { message: "Invalid parameters" });
    return;
  }

  client.name = name;
  client.avatar = avatar;
  client.joined = true;
  client.roomId = roomId;
  client.isAdmin = adminCode === room.adminCode;

  room.clients.set(client.id, client);

  const state = getRoomPublicState(roomId);
  const score = getRoomGlobalScore(roomId);

  sendToClient(client.id, "join_success", {
    id: client.id,
    roomId,
    users: state,
    globalScore: score,
  });

  broadcastToRoom(
    roomId,
    "user_joined",
    {
      id: client.id,
      name: client.name,
      avatar: client.avatar,
      isAdmin: client.isAdmin,
      users: state,
      globalScore: score,
    },
    client.id
  );

  broadcastScoreboard();
}

function handleGlobalMessage(client, payload) {
  const text = payload?.text?.toString().trim();

  if (!text) {
    sendToClient(client.id, "error", { message: "Empty message" });
    return;
  }

  broadcastToRoom(client.roomId, "global_message", {
    id: uuid(),
    from: { id: client.id, name: client.name, avatar: client.avatar },
    text,
    timestamp: Date.now(),
  });
}

function handlePrivateMessage(client, payload) {
  const targetId = payload?.targetId;
  const text = payload?.text?.toString().trim();

  if (!targetId || !text) {
    sendToClient(client.id, "error", { message: "Invalid private message" });
    return;
  }

  const room = getRoom(client.roomId);
  const target = room?.clients.get(targetId);

  if (!target || !target.joined) {
    sendToClient(client.id, "error", { message: "Target not found" });
    return;
  }

  const message = {
    id: uuid(),
    from: { id: client.id, name: client.name, avatar: client.avatar },
    to: targetId,
    text,
    timestamp: Date.now(),
  };

  sendToClient(targetId, "private_message", message);
  sendToClient(client.id, "private_message", message);
}

function handleScoreEvent(client, payload) {
  const delta = Number(payload?.delta || 0);

  if (!Number.isFinite(delta) || Math.abs(delta) > 100) {
    sendToClient(client.id, "error", { message: "Invalid score" });
    return;
  }

  client.score = Math.max(0, client.score + delta);

  broadcastToRoom(client.roomId, "score_update", {
    id: client.id,
    score: client.score,
    globalScore: getRoomGlobalScore(client.roomId),
  });

  broadcastToRoom(client.roomId, "users_update", {
    users: getRoomPublicState(client.roomId),
  });

  broadcastScoreboard();
}

function handleAdminDisconnect(client, payload) {
  if (!client.isAdmin) {
    sendToClient(client.id, "error", { message: "Insufficient permissions" });
    return;
  }

  const targetId = payload?.targetId;

  if (!targetId || targetId === client.id) {
    sendToClient(client.id, "error", { message: "Invalid target" });
    return;
  }

  const room = getRoom(client.roomId);

  if (!room?.clients.has(targetId)) {
    sendToClient(client.id, "error", { message: "User not found" });
    return;
  }

  disconnectClient(targetId);
}

function handleGetScoreboard(client) {
  sendToClient(client.id, "rooms_scoreboard", { rooms: getRoomsScoreboard() });
}

const messageHandlers = {
  create_room: handleCreateRoom,
  join: handleJoin,
  global_message: handleGlobalMessage,
  private_message: handlePrivateMessage,
  score_event: handleScoreEvent,
  request_disconnect_user: handleAdminDisconnect,
  get_scoreboard: handleGetScoreboard,
  ping: (client) => sendToClient(client.id, "pong", { timestamp: Date.now() }),
};

function processMessage(client, raw) {
  let message;

  try {
    message = JSON.parse(raw.toString());
  } catch {
    sendToClient(client.id, "error", { message: "Invalid JSON format" });
    return;
  }

  const { type, payload } = message;

  if (
    !client.joined &&
    type !== "join" &&
    type !== "create_room" &&
    type !== "get_scoreboard" &&
    type !== "ping"
  ) {
    sendToClient(client.id, "error", { message: "Authentication required" });
    return;
  }

  const handler = messageHandlers[type];

  if (handler) {
    handler(client, payload);
  } else {
    sendToClient(client.id, "error", { message: "Unknown type" });
  }
}

function cleanup(client) {
  const roomId = client.roomId;

  clients.delete(client.id);

  if (roomId) {
    const room = getRoom(roomId);
    if (room) {
      room.clients.delete(client.id);

      if (room.clients.size === 0) {
        rooms.delete(roomId);
        broadcastScoreboard();
      } else if (client.joined) {
        broadcastToRoom(roomId, "user_left", {
          id: client.id,
          users: getRoomPublicState(roomId),
          globalScore: getRoomGlobalScore(roomId),
        });
      }
    }
  }
}

function createClient(ws) {
  return {
    id: uuid(),
    ws,
    joined: false,
    name: null,
    avatar: null,
    score: 0,
    isAdmin: false,
    roomId: null,
  };
}

function createWebSocketServer() {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws) => {
    const client = createClient(ws);
    clients.set(client.id, client);

    try {
      ws.send(JSON.stringify({ type: "welcome", payload: { id: client.id } }));
    } catch {
      ws.terminate();
      return;
    }

    ws.on("message", (data) => processMessage(client, data));
    ws.on("close", () => cleanup(client));
    ws.on("error", () => cleanup(client));
  });

  return wss;
}

module.exports = {
  createWebSocketServer,
  clients,
  rooms,
};
