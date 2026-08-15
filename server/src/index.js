import http from "node:http";
import config from "./config.js";
import { createApp } from "./app.js";
import { setupWebSocket } from "./ws.js";
import store from "./store.js";
import { startOrderSweeper, stopOrderSweeper } from "./sweeper.js";

await store.init();
startOrderSweeper();

const app = createApp();
const server = http.createServer(app);

// WebSocket 实时中枢
const wsHub = setupWebSocket(server);
app.locals.ws = wsHub;

// 启动时预热缓存（可选）
import { cache } from "./middleware.js";
cache.set("app:started", new Date().toISOString(), 3600_000);

async function shutdown(signal) {
  console.log("[server] " + signal + "，等待数据落库...");
  try { if (store.close) await store.close(); } catch {}
  stopOrderSweeper();
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

server.listen(config.port, () => {
  console.log(`[server] 多端电商系统 API 已启动: http://localhost:${config.port}`);
  console.log(`[server] REST 前缀: /api/v1    WebSocket: ws://localhost:${config.port}/ws?token=<JWT>`);
  console.log(`[server] 数据模式: ${config.useMySql ? "MySQL" : "文件存储(dev/demo)"}  数据文件: ${config.dataFile}`);
  console.log(`[server] 种子账号: admin/admin123  merchant/merchant123  user/user123`);
});