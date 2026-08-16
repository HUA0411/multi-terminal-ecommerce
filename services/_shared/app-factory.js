import express from "express";
import http from "node:http";
import cors from "cors";
import { requestLog, securityHeaders, basicGuard } from "./middleware.js";
import { ApiError, ok } from "./util.js";
import config from "./config.js";

// 微服务标准应用工厂：安全头 + 基础防护 + JSON + 内部接口（X-Service-Token）+ 统一错误
export function createApp({ routers = [], internalRouters = [] } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors());
  app.use(securityHeaders);
  app.use(basicGuard);
  app.use(express.json({ limit: "2mb" }));
  app.use(requestLog);

  // 内部接口：仅允许持有服务令牌的进程调用（服务间通信）
  const internal = express.Router();
  internal.use((req, res, next) => {
    const t = req.headers["x-service-token"];
    if (t !== config.serviceToken) return res.status(403).json({ code: 403, data: null, message: "internal forbidden" });
    next();
  });
  for (const r of internalRouters) internal.use(r.prefix, r.router);
  app.use("/internal", internal);

  // 公开 API（对外统一 /api/v1 前缀）
  for (const r of routers) app.use("/api/v1" + r.prefix, r.router);

  app.get("/", (req, res) => res.json(ok({ service: config.serviceName, docs: "见 docs/api.md" })));
  app.get("/api/v1/health", (req, res) => res.json({ code: 0, data: { status: "up", service: config.serviceName, ts: new Date().toISOString() }, message: "ok" }));

  app.use((req, res) => res.status(404).json({ code: 404, data: null, message: "接口不存在" }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
      return res.status(err.status).json({ code: err.code, data: null, message: err.message });
    }
    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ code: 400, data: null, message: "请求体格式错误" });
    }
    console.error("[" + config.serviceName + "][error]", err);
    res.status(500).json({ code: 500, data: null, message: "服务器内部错误" });
  });
  return app;
}

// 内部处理器适配：纯函数 ({params, body, query}) -> data，供 express 路由复用
export function internalHandler(fn) {
  return async (req, res) => {
    try {
      const data = await fn({ params: req.params, body: req.body, query: req.query });
      res.json({ code: 0, data: data === undefined ? null : data, message: "ok" });
    } catch (e) {
      if (e instanceof ApiError) return res.status(e.status).json({ code: e.code, data: null, message: e.message });
      console.error("[internal]", e);
      res.status(500).json({ code: 500, data: null, message: "内部错误" });
    }
  };
}

export function startServer(app, port) {
  const server = http.createServer(app);
  server.listen(port, () => {
    console.log("[" + config.serviceName + "] " + config.serviceName + " 已启动: http://localhost:" + port);
  });
  return server;
}