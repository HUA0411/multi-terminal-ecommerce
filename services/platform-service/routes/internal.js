import { Router } from "express";
import store from "../../_shared/store.js";
import { internalHandler } from "../../_shared/app-factory.js";
import { publishToUser } from "../../_shared/publisher.js";

const router = Router();

// 通知写入（订单/营销等服务调用）+ 实时推送
router.post("/notifications", internalHandler(async ({ body }) => {
  const n = store.insert("notifications", {
    userId: Number(body && body.userId) || 0,
    title: String((body && body.title) || "").slice(0, 100),
    body: String((body && body.body) || "").slice(0, 500),
    read: false,
    createdAt: new Date().toISOString(),
  });
  await publishToUser(n.userId, { type: "notify", data: { title: n.title, body: n.body } });
  return { id: n.id };
}));

// 风控事件写入（登录失败/频控/支付风控等）
router.post("/risk-events", internalHandler(({ body }) => {
  const ev = store.insert("riskEvents", {
    userId: (body && body.userId) || null,
    type: (body && body.type) || "custom",
    level: (body && body.level) || "low",
    detail: (body && body.detail) || {},
    ip: (body && body.ip) || "",
    createdAt: (body && body.createdAt) || new Date().toISOString(),
  });
  return { id: ev.id };
}));

// 审计日志写入（各服务管理操作）
router.post("/audit", internalHandler(({ body }) => {
  const ev = store.insert("auditLogs", {
    adminId: (body && body.adminId) || null,
    adminName: (body && body.adminName) || "",
    action: (body && body.action) || "",
    target: (body && body.target) || "",
    detail: (body && body.detail) || {},
    ip: (body && body.ip) || "",
    createdAt: (body && body.createdAt) || new Date().toISOString(),
  });
  return { id: ev.id };
}));

export default router;
