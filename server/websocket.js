const { WebSocketServer } = require("ws");
const { v4: uuid } = require("uuid");

const ADMIN_CODE = "root";
const clients = new Map();

function getPublicState() {
  return Array.from(clients.values())
    .filter((client) => client.joined)
    .map(({ id, name, avatar, score, isAdmin }) => ({
      id,
      name,
      avatar,
      score,
      isAdmin,
    }));
}

function getGlobalScore() {
  return getPublicState().reduce((total, client) => total + client.score, 0);
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

function broadcast(type, payload, excludeId) {
  const message = JSON.stringify({ type, payload });

  clients.forEach((client) => {
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

function handleJoin(client, payload) {
  if (client.joined) {
    sendToClient(client.id, "error", { message: "Déjà connecté." });
    return;
  }

  const name = payload?.name?.toString().trim();
  const avatar = payload?.avatar?.toString().trim();
  const adminCode = payload?.adminCode?.toString().trim();

  if (!name || name.length > 24 || !avatar) {
    sendToClient(client.id, "error", { message: "Paramètres invalides." });
    return;
  }

  client.name = name;
  client.avatar = avatar;
  client.joined = true;
  client.isAdmin = adminCode === ADMIN_CODE;

  const state = getPublicState();
  const score = getGlobalScore();

  sendToClient(client.id, "join_success", {
    id: client.id,
    users: state,
    globalScore: score,
  });

  broadcast(
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
}

function handleGlobalMessage(client, payload) {
  const text = payload?.text?.toString().trim();

  if (!text) {
    sendToClient(client.id, "error", { message: "Message vide." });
    return;
  }

  broadcast("global_message", {
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

  client.score = Math.max(0, client.score + delta);

  broadcast("score_update", {
    id: client.id,
    score: client.score,
    globalScore: getGlobalScore(),
  });

  broadcast("users_update", { users: getPublicState() });
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

  disconnectClient(targetId);
}

const messageHandlers = {
  join: handleJoin,
  global_message: handleGlobalMessage,
  private_message: handlePrivateMessage,
  score_event: handleScoreEvent,
  request_disconnect_user: handleAdminDisconnect,
  ping: (client) => sendToClient(client.id, "pong", { timestamp: Date.now() }),
};

function processMessage(client, raw) {
  let message;

  try {
    message = JSON.parse(raw.toString());
  } catch {
    sendToClient(client.id, "error", { message: "Format JSON invalide." });
    return;
  }

  const { type, payload } = message;

  if (!client.joined && type !== "join") {
    sendToClient(client.id, "error", { message: "Authentification requise." });
    return;
  }

  const handler = messageHandlers[type];

  if (handler) {
    handler(client, payload);
  } else {
    sendToClient(client.id, "error", { message: "Type inconnu." });
  }
}

function cleanup(client) {
  clients.delete(client.id);

  if (!client.joined) return;

  broadcast("user_left", {
    id: client.id,
    users: getPublicState(),
    globalScore: getGlobalScore(),
  });
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
  ADMIN_CODE,
};
