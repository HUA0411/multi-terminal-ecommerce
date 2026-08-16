import { spawn } from "node:child_process";
import { writeFileSync as fsWrite } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================
// 微服务编排器：依次拉起领域服务（各自独立进程/端口/数据），最后启动网关
// 用法：ECOM_MODE=micro node src/index.js（或 npm run dev:micro）
// ============================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const servicesDir = path.join(__dirname, "..");

export const SERVICE_DEFS = [
  { name: "auth", dir: "auth-service", colls: "users,addresses" },
  { name: "catalog", dir: "catalog-service", colls: "products,productSkus,categories,reviews,favorites,fittingGarments,fittingSessions,translations,currencies" },
  { name: "cart", dir: "cart-service", colls: "cartItems" },
  { name: "trade", dir: "trade-service", colls: "orders,orderItems,payments,logistics,aftersales" },
  { name: "marketing", dir: "marketing-service", colls: "coupons,userCoupons,flashSales,shares,pointsLogs,pointsProducts,redemptions,groupons" },
  { name: "merchant", dir: "merchant-service", colls: "merchants,quotes" },
  { name: "content", dir: "content-service", colls: "cmsPages,cmsTemplates,liveRooms,liveMessages" },
  { name: "platform", dir: "platform-service", colls: "notifications,riskEvents,riskRules,auditLogs" },
  { name: "dashboard", dir: "dashboard-service", colls: "" },
];

const PORTS = { auth: 4010, catalog: 4020, cart: 4030, trade: 4040, marketing: 4050, merchant: 4060, content: 4070, platform: 4080, dashboard: 4090 };

const children = [];

export async function waitHealth(port, name, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch("http://127.0.0.1:" + port + "/api/v1/health");
      if (r.ok) return true;
    } catch {}
    await new Promise((res) => setTimeout(res, 300));
  }
  return false;
}

process.on("uncaughtException", (e) => {
  try { fsWrite(process.env.PORT + ".crash.log", "uncaught: " + (e && e.stack || e) + "\n"); } catch {}
  console.error("[gateway] uncaughtException:", e);
  process.exit(1);
});
process.on("unhandledRejection", (e) => {
  try { require("node:fs").writeFileSync(process.env.PORT + ".crash.log", "rejection: " + (e && e.stack || e) + "\n"); } catch {}
  console.error("[gateway] unhandledRejection:", e);
  process.exit(1);
});

export async function runGateway() {
  // 1) 拉起领域服务
  for (const def of SERVICE_DEFS) {
    const port = PORTS[def.name];
    const child = spawn(process.execPath, [path.join(servicesDir, def.dir || def.name, "index.js")], {
      stdio: ["pipe", "inherit", "inherit"],
      env: {
        ...process.env,
        ECOM_MODE: "micro",
        SERVICE_NAME: def.name,
        OWNED_COLLECTIONS: def.colls,
        PORT: String(port),
        GATEWAY_URL: "http://127.0.0.1:" + (Number(process.env.PORT) || 4000),
      },
    });
    children.push(child);
    const ok = await waitHealth(port, def.name);
    if (!ok) {
      console.error("[gateway] 服务 " + def.name + " 启动失败（端口 " + port + "）");
      process.exit(1);
    }
    console.log("[gateway] " + def.name + " 就绪 :" + port);
  }
  // 2) 启动网关
  process.env.SERVICE_NAME = "gateway";
  const config = (await import("../_shared/config.js")).default;
  const { createGateway, setupWs } = await import("./index.js");
  const http = (await import("node:http")).default;
  const app = createGateway();
  const server = http.createServer(app);
  const wsHub = setupWs(server);
  app.locals.ws = wsHub;
  server.listen(config.port, () => {
    console.log("[gateway] 多端电商系统 API 网关已启动: http://localhost:" + config.port);
    console.log("[gateway] REST 前缀: /api/v1    WebSocket: ws://localhost:" + config.port + "/ws?token=<JWT>");
    console.log("[gateway] 微服务: " + SERVICE_DEFS.map((d) => d.name + ":" + PORTS[d.name]).join("  "));
  });
  const killChildren = () => {
    children.forEach((c) => { try { c.kill("SIGTERM"); } catch {} });
  };
  const shutdown = () => {
    killChildren();
    setTimeout(() => process.exit(0), 500);
  };
  // 兜底：进程以任何方式退出时尽可能带走子进程
  process.on("exit", killChildren);
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}