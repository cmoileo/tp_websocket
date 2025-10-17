const { WebSocketServer } = require("ws");
const { v4: uuid } = require("uuid");

const ADMIN_CODE = process.env.ADMIN_CODE || "admin123";
const clients = new Map();

function publicState() {
  return Array.from(clients.values())
    .filter((client) => client.joined)
    .map((client) => ({
      id: client.id,
      name: client.name,
      avatar: client.avatar,
      score: client.score,
      isAdmin: client.isAdmin,
    }));
}

function globalScore() {
  return publicState().reduce((total, client) => total + client.score, 0);
}

function sendToClient(clientId, type, payload) {
  const client = clients.get(clientId);
  if (!client) return;
  try {
    client.ws.send(JSON.stringify({ type, payload }));
  } catch (error) {
    client.ws.terminate();
  }
}

function broadcast(type, payload, excludeId) {
  const message = JSON.stringify({ type, payload });
  clients.forEach((client) => {
    if (!client.joined) return;
    if (excludeId && client.id === excludeId) return;
    try {
      client.ws.send(message);
    } catch (error) {
      client.ws.terminate();
    }
  });
}

function disconnectClient(clientId, reason) {
  const client = clients.get(clientId);
  if (client) {
    try {
      client.ws.close(1000, reason);
    } catch (error) {}
  }
}

function handleJoin(client, payload) {
  const name = payload?.name?.toString().trim();
  const avatar = payload?.avatar?.toString().trim();
  const adminCode = payload?.adminCode?.toString().trim();
  if (!name || name.length > 24 || !avatar) {
    sendToClient(client.id, "join_error", { message: "Paramètres invalides." });
    return;
  }
  client.name = name;
  client.avatar = avatar;
  client.joined = true;
  client.isAdmin = adminCode === ADMIN_CODE;
  const currentState = publicState();
  const currentGlobalScore = globalScore();
  sendToClient(client.id, "join_success", {
    id: client.id,
    users: currentState,
    globalScore: currentGlobalScore,
  });
  broadcast("user_joined", {
    name: client.name,
    users: currentState,
    globalScore: currentGlobalScore,
  });
}

function handleGlobalMessage(client, payload) {
  const text = payload?.text?.toString().trim();
  if (!text) {
    sendToClient(client.id, "error", { message: "Message vide." });
    return;
  }
  const message = {
    id: uuid(),
    from: { id: client.id, name: client.name, avatar: client.avatar },
    text,
    timestamp: Date.now(),
  };
  broadcast("global_message", message);
}

function handlePrivateMessage(client, payload) {
  const targetId = payload?.targetId;
  const text = payload?.text?.toString().trim();
  if (!targetId || !text) {
    sendToClient(client.id, "error", {
      message: "Paramètres privés invalides.",
    });
    return;
  }
  const target = clients.get(targetId);
  if (!target || !target.joined) {
    sendToClient(client.id, "error", { message: "Destinataire introuvable." });
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
    sendToClient(client.id, "error", { message: "Score invalide." });
    return;
  }
  client.score += delta;
  if (client.score < 0) client.score = 0;
  broadcast("score_update", {
    id: client.id,
    score: client.score,
    globalScore: globalScore(),
  });
  broadcast("users_update", { users: publicState() });
}

function handleAdminDisconnect(client, payload) {
  if (!client.isAdmin) {
    sendToClient(client.id, "error", { message: "Droits insuffisants." });
    return;
  }
  const targetId = payload?.targetId;
  if (!targetId || targetId === client.id) {
    sendToClient(client.id, "error", { message: "Cible invalide." });
    return;
  }
  if (!clients.has(targetId)) {
    sendToClient(client.id, "error", { message: "Utilisateur inconnu." });
    return;
  }
  disconnectClient(targetId, "admin_disconnect");
}

function processMessage(client, raw) {
  let message;
  try {
    message = JSON.parse(raw.toString());
  } catch (error) {
    sendToClient(client.id, "error", { message: "Format JSON invalide." });
    return;
  }
  const type = message?.type;
  if (!client.joined && type !== "join") {
    sendToClient(client.id, "error", { message: "Authentification requise." });
    return;
  }
  switch (type) {
    case "join":
      handleJoin(client, message.payload);
      return;
    case "global_message":
      handleGlobalMessage(client, message.payload);
      return;
    case "private_message":
      handlePrivateMessage(client, message.payload);
      return;
    case "score_event":
      handleScoreEvent(client, message.payload);
      return;
    case "request_disconnect_user":
      handleAdminDisconnect(client, message.payload);
      return;
    case "ping":
      sendToClient(client.id, "pong", { timestamp: Date.now() });
      return;
    default:
      sendToClient(client.id, "error", { message: "Type inconnu." });
      return;
  }
}

function cleanup(client) {
  clients.delete(client.id);
  if (!client.joined) return;
  broadcast("user_left", {
    id: client.id,
    users: publicState(),
    globalScore: globalScore(),
  });
}

function createWebSocketServer() {
  const wss = new WebSocketServer({ noServer: true });
  wss.on("connection", (ws) => {
    const id = uuid();
    const client = {
      id,
      ws,
      joined: false,
      name: null,
      avatar: null,
      score: 0,
      isAdmin: false,
    };
    clients.set(id, client);
    try {
      ws.send(JSON.stringify({ type: "welcome", payload: { id } }));
    } catch (error) {
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
  ADMIN_CODE,
};
