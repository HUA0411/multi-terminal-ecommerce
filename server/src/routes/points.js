import { Router } from "express";
import store from "../store.js";
import { auth } from "../middleware.js";
import { asyncHandler, ok, fail, paginate, uid, now } from "../util.js";

const router = Router();

// 积分商品列表（公开）
router.get("/points/products", asyncHandler(async (req, res) => {
  const list = store.find("pointsProducts", (p) => p.status === "active").map((p) => ({ id: p.id, name: p.name, image: p.image, points: p.points, stock: p.stock }));
  res.json(ok(list));
}));

// 创建积分商品（admin/merchant）
router.post("/admin/points/products", auth("admin", "merchant"), asyncHandler(async (req, res) => {
  const { name, points, stock, image } = req.body || {};
  if (!name || !points || points <= 0) return fail(400, 400, "名称与所需积分必填");
  const p = store.insert("pointsProducts", { name, points: Math.round(Number(points)), stock: Math.round(Number(stock) || 0), image: image || "", status: "active", createdAt: now() });
  res.json(ok(p));
}));

// 更新积分商品（admin/merchant）
router.put("/admin/points/products/:id", auth("admin", "merchant"), asyncHandler(async (req, res) => {
  const p = store.get("pointsProducts", req.params.id);
  if (!p) return fail(404, 404, "积分商品不存在");
  const patch = {};
  ["name", "image", "status"].forEach((k) => { if (req.body[k] !== undefined) patch[k] = req.body[k]; });
  if (req.body.points !== undefined) patch.points = Math.round(Number(req.body.points));
  if (req.body.stock !== undefined) patch.stock = Math.round(Number(req.body.stock));
  res.json(ok(store.update("pointsProducts", p.id, patch)));
}));

// 积分兑换（登录）
router.post("/points/redemptions", auth(), asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body || {};
  const product = store.get("pointsProducts", productId);
  if (!product || product.status !== "active") return fail(404, 404, "积分商品不存在");
  const qty = Math.max(1, Math.min(99, Number(quantity) || 1));
  if (product.stock < qty) return fail(400, 400, "积分商品库存不足");
  const cost = product.points * qty;
  const user = store.get("users", req.user.id);
  if ((user.points || 0) < cost) return fail(400, 400, "积分不足，还差 " + (cost - (user.points || 0)) + " 积分");
  // 扣积分 + 减库存
  store.update("users", user.id, { points: (user.points || 0) - cost });
  store.update("pointsProducts", product.id, { stock: product.stock - qty });
  store.insert("pointsLogs", { userId: user.id, points: -cost, reason: "积分商城兑换「" + product.name + "」x" + qty, refId: product.id, createdAt: now() });
  const redemption = store.insert("redemptions", { userId: user.id, productId: product.id, productName: product.name, image: product.image, points: cost, quantity: qty, code: "R" + uid(10).toUpperCase(), status: "pending", createdAt: now() });
  res.json(ok(redemption));
}));

// 我的兑换记录（登录）
router.get("/my/redemptions", auth(), asyncHandler(async (req, res) => {
  const list = store.find("redemptions", (r) => r.userId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(ok(paginate(list, req.query.page, req.query.pageSize)));
}));

// 确认发放兑换码/发货（admin/merchant）
router.post("/admin/redemptions/:id/confirm", auth("admin", "merchant"), asyncHandler(async (req, res) => {
  const r = store.get("redemptions", req.params.id);
  if (!r) return fail(404, 404, "兑换记录不存在");
  if (r.status !== "pending") return fail(400, 400, "兑换单已处理");
  const red = store.update("redemptions", r.id, { status: "fulfilled", fulfilledAt: now() });
  const u = store.get("users", r.userId);
  if (u && req.app.locals.ws) req.app.locals.ws.publishToUser(u.id, { type: "notify", data: { title: "兑换已发放", body: "「" + r.productName + "」兑换码：" + r.code } });
  res.json(ok(red));
}));

export default router;
