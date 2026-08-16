import { Router } from "express";
import store from "../../_shared/store.js";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok, paginate } from "../../_shared/util.js";

const router = Router();

// 风险事件记录（内部/前端上报）
router.post("/events", asyncHandler(async (req, res) => {
  const { type, level, detail } = req.body || {};
  const ev = store.insert("riskEvents", {
    userId: req.user ? req.user.id : null,
    type: type || "custom",
    level: level || "low",
    detail: detail || {},
    ip: req.ip,
    createdAt: new Date().toISOString(),
  });
  res.json(ok({ id: ev.id }));
}));

router.get("/admin/events", auth("admin"), asyncHandler(async (req, res) => {
  const list = store.all("riskEvents").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(ok(paginate(list, req.query.page, req.query.pageSize)));
}));

router.get("/admin/rules", auth("admin"), asyncHandler(async (req, res) => {
  res.json(ok(store.all("riskRules")));
}));

export default router;
