const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const WebSocket = require("ws");
const http = require("http");
const {
  createWebSocketServer,
  clients,
  ADMIN_CODE,
} = require("../server/websocket.js");

async function waitForType(socket, expectedType) {
  for (;;) {
    const [data] = await once(socket, "message");
    const message = JSON.parse(data.toString());
    if (message.type === expectedType) return message;
  }
}

async function spawnClient(port, payload) {
  const socket = new WebSocket(`ws://localhost:${port}/ws`);
  await once(socket, "open");
  await waitForType(socket, "welcome");
  socket.send(JSON.stringify({ type: "join", payload }));
  const response = await waitForType(socket, "join_success");
  return { socket, join: response.payload };
}

let server;
let wss;

async function start() {
  if (server) return server;

  server = http.createServer();
  wss = createWebSocketServer();

  server.on("upgrade", (req, socket, head) => {
    const url = req.url && req.url.split("?")[0];
    if (url === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
      return;
    }
    socket.destroy();
  });

  await new Promise((resolve) => {
    server.listen(0, () => resolve());
  });

  return server;
}

async function stop() {
  if (wss) {
    wss.clients.forEach((socket) => {
      try {
        socket.close();
      } catch (error) {}
    });
    wss.close();
    wss = undefined;
  }

  if (server) {
    await new Promise((resolve) => server.close(() => resolve()));
    server = undefined;
  }

  clients.clear();
}

test("workflow complet", async (t) => {
  const serverInstance = await start();
  const port = serverInstance.address().port;

  t.after(async () => {
    await stop();
  });

  const alpha = await spawnClient(port, {
    name: "Alpha",
    avatar: "🦊",
    adminCode: ADMIN_CODE,
  });
  assert.equal(alpha.join.users.length, 1);
  assert.equal(alpha.join.users[0].isAdmin, true);

  const betaPromise = spawnClient(port, { name: "Beta", avatar: "🐼" });
  const joined = await waitForType(alpha.socket, "user_joined");
  assert.equal(joined.payload.name, "Beta");
  const beta = await betaPromise;

  beta.socket.send(
    JSON.stringify({ type: "global_message", payload: { text: "Salut" } })
  );
  const globalMsg = await waitForType(alpha.socket, "global_message");
  assert.equal(globalMsg.payload.text, "Salut");
  assert.equal(globalMsg.payload.from.name, "Beta");

  beta.socket.send(
    JSON.stringify({
      type: "private_message",
      payload: { targetId: alpha.join.id, text: "Ping" },
    })
  );
  const privateMsg = await waitForType(alpha.socket, "private_message");
  assert.equal(privateMsg.payload.text, "Ping");
  assert.equal(privateMsg.payload.from.name, "Beta");

  alpha.socket.send(
    JSON.stringify({ type: "score_event", payload: { delta: 2 } })
  );
  const scoreMsg = await waitForType(alpha.socket, "score_update");
  assert.equal(scoreMsg.payload.score, 2);
  assert.equal(scoreMsg.payload.globalScore, 2);
  await waitForType(alpha.socket, "users_update");

  alpha.socket.send(
    JSON.stringify({
      type: "request_disconnect_user",
      payload: { targetId: beta.join.id },
    })
  );
  const leftMsg = await waitForType(alpha.socket, "user_left");
  assert.equal(leftMsg.payload.users.length, 1);
  assert.equal(clients.size, 1);

  beta.socket.close();
  alpha.socket.close();
});
