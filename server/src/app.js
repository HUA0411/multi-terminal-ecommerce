import express from "express";
import cors from "cors";
import api from "./routes/index.js";
import { requestLog } from "./middleware.js";
import { ApiError, ok } from "./util.js";

export function createApp() {
  const app = express();
  app.locals.ws = null;

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use(requestLog);

  app.use("/api/v1", api);

  app.get("/", (req, res) => res.json(ok({ name: "多端电商系统 API", docs: "见 docs/api.md", health: "/api/v1/health" })));

  // 404
  app.use((req, res) => res.status(404).json({ code: 404, data: null, message: "接口不存在" }));

  // 统一错误处理
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
      return res.status(err.status).json({ code: err.code, data: null, message: err.message });
    }
    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ code: 400, data: null, message: "请求体格式错误" });
    }
    console.error("[error]", err);
    res.status(500).json({ code: 500, data: null, message: "服务器内部错误" });
  });

  return app;
}
