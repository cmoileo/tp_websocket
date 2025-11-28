const http = require("http");
const next = require("next");
const {
  createWebSocketServer,
  clients,
  ADMIN_CODE,
} = require("./server/websocket");

const PORT = parseInt(process.env.PORT || "3000", 10);
const WS_PATH = process.env.WS_PATH || "/ws";
const isDev = process.env.NODE_ENV !== "production";

const nextApp = next({ dev: isDev });
const handle = nextApp.getRequestHandler();

let serverInstance;
let wssInstance;

async function start() {
  if (serverInstance) return serverInstance;

  await nextApp.prepare();

  const server = http.createServer((req, res) => handle(req, res));
  const wss = createWebSocketServer();

  const nextUpgrade =
    typeof nextApp.getUpgradeHandler === "function"
      ? nextApp.getUpgradeHandler()
      : null;

  server.on("upgrade", (req, socket, head) => {
    const url = req.url?.split("?")[0];

    if (url === WS_PATH) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
      return;
    }

    if (nextUpgrade) {
      nextUpgrade(req, socket, head);
      return;
    }

    socket.destroy();
  });

  await new Promise((resolve) => server.listen(PORT, resolve));

  serverInstance = server;
  wssInstance = wss;

  return server;
}

async function stop() {
  if (wssInstance) {
    wssInstance.clients.forEach((socket) => {
      try {
        socket.close();
      } catch {}
    });
    wssInstance.close();
    wssInstance = undefined;
  }

  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
    serverInstance = undefined;
  }

  if (nextApp) {
    await nextApp.close();
  }
}

if (require.main === module) {
  start().then(() => {
    console.log(`Serveur Next démarré sur http://localhost:${PORT}`);
  });
}

module.exports = { start, stop, clients, ADMIN_CODE, WS_PATH };
