import express from "express";
import http from "node:http";
import cors from "cors";
import { WebSocketServer } from "ws";
import { securityHeaders, basicGuard, requestLog } from "../_shared/middleware.js";
import { verifyToken, ok, ApiError } from "../_shared/util.js";
import { callInternal } from "../_shared/internal-client.js";
import config from "../_shared/config.js";

// ============================================================
// API 网关（微服务形态）
// - 对外唯一入口：/api/v1/*（按前缀路由到对应领域服务）
// - WebSocket 实时中枢：订阅房间由网关持有，服务经 /internal/publish 发布
// - 内部接口：仅服务间调用（X-Service-Token）
// ============================================================

// 前缀路由表（最长前缀优先）
export const ROUTES = [
  ["/admin/dashboard", "dashboard"],
  ["/merchant/dashboard", "dashboard"],
  ["/admin/cms", "content"],
  ["/admin/merchants", "merchant"],
  ["/admin/products", "catalog"],
  ["/admin/audit-logs", "platform"],
  ["/admin/orders", "trade"],
  ["/admin/aftersales", "trade"],
  ["/admin/quotes", "merchant"],
  ["/admin/b2b-customers", "merchant"],
  ["/admin/points", "marketing"],
  ["/admin/redemptions", "marketing"],
  ["/admin/users", "auth"],
  ["/points", "marketing"],
  ["/favorites", "catalog"],
  ["/my/quotes", "merchant"],
  ["/my/groupons", "marketing"],
  ["/my/points", "marketing"],
  ["/my/coupons", "marketing"],
  ["/my/redemptions", "marketing"],
  ["/auth", "auth"],
  ["/addresses", "auth"],
  ["/products", "catalog"],
  ["/categories", "catalog"],
  ["/search", "catalog"],
  ["/recommendations", "catalog"],
  ["/fitting", "catalog"],
  ["/settings", "catalog"],
  ["/i18n", "catalog"],
  ["/currencies", "catalog"],
  ["/convert", "catalog"],
  ["/cart", "cart"],
  ["/orders", "trade"],
  ["/payments", "trade"],
  ["/aftersales", "trade"],
  ["/coupons", "marketing"],
  ["/flashsales", "marketing"],
  ["/shares", "marketing"],
  ["/groupons", "marketing"],
  ["/notifications", "platform"],
  ["/risk", "platform"],
  ["/cms", "content"],
  ["/live", "content"],
  ["/merchants", "merchant"],
  ["/quotes", "merchant"],
];

export function routeFor(path) {
  let best = null;
  for (const [prefix, service] of ROUTES) {
    if (path === prefix || path.startsWith(prefix + "/")) {
      if (!best || prefix.length > best[0].length) best = [prefix, service];
    }
  }
  return best ? best[1] : null;
}

export function createGateway() {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors());
  app.use(securityHeaders);
  app.use(basicGuard);
  app.use(express.json({ limit: "2mb" }));
  app.use(requestLog);

  // ---------- 服务健康（聚合） ----------
  app.get("/api/v1/health", async (req, res) => {
    const statuses = {};
    const { REGISTRY } = await import("../_shared/registry.js");
    for (const [name, meta] of Object.entries(REGISTRY)) {
      if (name === "gateway") continue;
      try {
        const r = await fetch("http://127.0.0.1:" + meta.port + "/api/v1/health");
        statuses[name] = r.ok ? "up" : "down";
      } catch {
        statuses[name] = "down";
      }
    }
    res.json({ code: 0, data: { status: "up", gateway: true, services: statuses, ts: new Date().toISOString() }, message: "ok" });
  });

  // ---------- 内部接口（服务间） ----------
  const internal = express.Router();
  internal.use((req, res, next) => {
    if (req.headers["x-service-token"] !== config.serviceToken) return res.status(403).json({ code: 403, data: null, message: "internal forbidden" });
    next();
  });
  internal.post("/publish", (req, res) => {
    const { room, event } = req.body || {};
    if (!room || !event) return res.status(400).json({ code: 400, data: null, message: "room/event 必填" });
    if (app.locals.ws) app.locals.ws.publish(room, event);
    res.json({ code: 0, data: { published: true }, message: "ok" });
  });
  internal.get("/ws/online", (req, res) => {
    res.json({ code: 0, data: { online: app.locals.ws ? app.locals.ws.online() : 0 }, message: "ok" });
  });
  app.use("/internal", internal);

  // ---------- 外部代理 ----------
  app.use("/api/v1", async (req, res) => {
    const path = (req.originalUrl.replace(/^\/api\/v1/, "").split("?")[0]) || "/";
    const service = routeFor(path);
    if (!service) return res.status(404).json({ code: 404, data: null, message: "接口不存在" });
    const { REGISTRY } = await import("../_shared/registry.js");
    const port = REGISTRY[service].port;
    const qs = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
    const headers = { "content-type": "application/json" };
    if (req.headers.authorization) headers.authorization = req.headers.authorization;
    try {
      const r = await fetch("http://127.0.0.1:" + port + "/api/v1" + path + qs, {
        method: req.method,
        headers,
        body: ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) ? JSON.stringify(req.body || {}) : undefined,
      });
      const text = await r.text();
      res.status(r.status);
      const ct = r.headers.get("content-type") || "";
      if (ct.includes("text/csv")) {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", r.headers.get("content-disposition") || "attachment");
        return res.send(text);
      }
      res.setHeader("Content-Type", ct);
      res.send(text);
    } catch (e) {
      console.error("[gateway] proxy error:", service, path, e.message);
      res.status(502).json({ code: 502, data: null, message: "服务暂不可用" });
    }
  });

  app.get("/", (req, res) => res.json(ok({ name: "多端电商系统 API 网关", services: "micro", docs: "见 docs/api.md" })));
  app.use((req, res) => res.status(404).json({ code: 404, data: null, message: "接口不存在" }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ApiError) return res.status(err.status).json({ code: err.code, data: null, message: err.message });
    if (err.type === "entity.parse.failed") return res.status(400).json({ code: 400, data: null, message: "请求体格式错误" });
    console.error("[gateway][error]", err);
    res.status(500).json({ code: 500, data: null, message: "服务器内部错误" });
  });
  return app;
}

// ---------- WebSocket 中枢（微服务形态：认证取 JWT payload；直播互动转发 content 服务） ----------
export function setupWs(server) {
  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, "http://localhost");
    const token = url.searchParams.get("token");
    let user = null;
    if (token) {
      try {
        const payload = verifyToken(token);
        user = { id: payload.id, nickname: payload.nickname || "", avatar: "", role: payload.role || "user" };
      } catch { /* 匿名连接 */ }
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = user;
      ws.rooms = new Set();
      if (user) {
        ws.rooms.add("cart:" + user.id);
        ws.rooms.add("notify:" + user.id);
      }
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    const who = ws.user ? ws.user.nickname + "(#" + ws.user.id + ")" : "anonymous";
    console.log("[ws] connected " + who + ", rooms=" + [...ws.rooms].join(","));
    ws.on("message", (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      switch (msg.type) {
        case "subscribe":
          (msg.rooms || []).forEach((r) => {
            if (r === "cart") ws.rooms.add("cart:" + (ws.user ? ws.user.id : "guest"));
            else if (r === "notify") ws.rooms.add("notify:" + (ws.user ? ws.user.id : "guest"));
            else ws.rooms.add(String(r));
          });
          break;
        case "unsubscribe":
          (msg.rooms || []).forEach((r) => ws.rooms.delete(String(r)));
          break;
        // ---- 直播互动：转发内容服务落库，再推房间 ----
        case "live:chat": {
          const content = String(msg.content || "").slice(0, 200);
          if (!content) break;
          const roomId = Number(msg.roomId);
          const user = ws.user ? { id: ws.user.id, nickname: ws.user.nickname, avatar: ws.user.avatar || "" } : { id: 0, nickname: "游客", avatar: "" };
          callInternal("content", "POST", "/internal/live/chat", { roomId, content, user }).then((ev) => {
            if (ev && ev.data) publish("live:" + roomId, ev);
          }).catch(() => {});
          break;
        }
        case "live:like": {
          const roomId = Number(msg.roomId);
          callInternal("content", "POST", "/internal/live/like", { roomId }).then((ev) => {
            if (ev && ev.data) publish("live:" + roomId, ev);
          }).catch(() => {});
          break;
        }
        case "live:product": {
          const roomId = Number(msg.roomId);
          publish("live:" + roomId, { type: "live:product", data: { roomId, productId: msg.productId } });
          break;
        }
        case "ping":
          ws.send(JSON.stringify({ type: "pong" }));
          break;
      }
    });
    ws.on("close", () => console.log("[ws] disconnected " + who));
  });

  function publish(room, event) {
    const payload = JSON.stringify(event);
    let sent = 0;
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN && client.rooms.has(room)) {
        client.send(payload);
        sent++;
      }
    });
    if (sent) console.log("[ws] -> " + room + " x" + sent + " " + event.type);
  }
  return {
    publish,
    publishToUser(userId, event) {
      publish("cart:" + userId, event);
      publish("notify:" + userId, event);
    },
    online() { return wss.clients.size; },
    broadcast(event) {
      const payload = JSON.stringify(event);
      wss.clients.forEach((c) => { if (c.readyState === c.OPEN) c.send(payload); });
    },
  };
}