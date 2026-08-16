// ============================================================
// 多端电商系统 · 服务入口
// - 默认（monolith）：模块化单体，所有领域模块同进程组合（开发/演示）
// - ECOM_MODE=micro：微服务形态 —— 拉起 9 个领域服务 + API 网关（独立进程/端口/数据）
// ============================================================

if (process.env.ECOM_MODE === "micro") {
  const { runGateway } = await import("../../services/gateway/orchestrator.js");
  await runGateway();
} else {
  await runMonolith();
}

async function runMonolith() {
  const config = (await import("./config.js")).default;
  const { createApp } = await import("./app.js");
  const { setupWebSocket } = await import("./ws.js");
  const store = (await import("./store.js")).default;
  const { startOrderSweeper, stopOrderSweeper } = await import("./sweeper.js");

  await store.init();
  startOrderSweeper();

  const app = createApp();
  const server = http.createServer(app);

  // WebSocket 实时中枢
  const wsHub = setupWebSocket(server);
  app.locals.ws = wsHub;

  // 启动时预热缓存（可选）
  const { cache } = await import("./middleware.js");
  cache.set("app:started", new Date().toISOString(), 3600000);

  async function shutdown(signal) {
    console.log("[server] " + signal + "，等待数据落库...");
    try { if (store.close) await store.close(); } catch {}
    stopOrderSweeper();
    process.exit(0);
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  server.listen(config.port, () => {
    console.log("[server] 多端电商系统 API 已启动: http://localhost:" + config.port);
    console.log("[server] REST 前缀: /api/v1    WebSocket: ws://localhost:" + config.port + "/ws?token=<JWT>");
    console.log("[server] 数据模式: " + (config.useMySql ? "MySQL" : "文件存储(dev/demo)") + "  数据文件: " + config.dataFile);
    console.log("[server] 种子账号: admin/admin123  merchant/merchant123  user/user123");
  });
}

import http from "node:http";
