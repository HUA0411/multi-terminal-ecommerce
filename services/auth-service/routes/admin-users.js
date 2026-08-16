import { Router } from "express";
import store from "../../_shared/store.js";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok, fail, paginate } from "../../_shared/util.js";
import { auditLog } from "../../_shared/audit.js";

const router = Router();
router.use(auth("admin"));

// 用户列表
router.get("/users", asyncHandler(async (req, res) => {
  const list = store.all("users").map((u) => ({ id: u.id, phone: u.phone, nickname: u.nickname, role: u.role, points: u.points, status: u.status, customerType: u.customerType || "retail", createdAt: u.createdAt }));
  res.json(ok(paginate(list, req.query.page, req.query.pageSize)));
}));

// 启用/禁用
router.put("/users/:id/status", asyncHandler(async (req, res) => {
  const u = store.get("users", req.params.id);
  if (!u) return fail(404, 404, "用户不存在");
  const status = req.body.status === "active" ? "active" : "banned";
  store.update("users", u.id, { status });
  auditLog(req.user, "user.status", "user:" + u.id, { status }, req.ip);
  res.json(ok({ id: u.id, status }));
}));

// 客户类型（B2C retail / B2B wholesale）
router.put("/users/:id/customer-type", asyncHandler(async (req, res) => {
  const u = store.get("users", req.params.id);
  if (!u) return fail(404, 404, "用户不存在");
  const type = req.body.customerType === "wholesale" ? "wholesale" : "retail";
  store.update("users", u.id, { customerType: type });
  auditLog(req.user, "user.customerType", "user:" + u.id, { customerType: type }, req.ip);
  res.json(ok({ id: u.id, customerType: type }));
}));

export default router;
