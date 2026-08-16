import { Router } from "express";
import store from "../../_shared/store.js";
import { internalHandler } from "../../_shared/app-factory.js";
import { publicUser, ApiError } from "../../_shared/util.js";

const router = Router();

// 批量取用户（字面路径须在 /users/:id 之前）
router.get("/users/batch", internalHandler(({ query }) => {
  const ids = String(query.ids || "").split(",").map((s) => Number(s.trim())).filter(Boolean);
  const list = ids.map((id) => store.get("users", id)).filter(Boolean);
  return { list };
}));

// 批量查询用户（按 role / customerType 过滤）
router.get("/users/query", internalHandler(({ query }) => {
  let list = store.all("users");
  if (query.role) list = list.filter((u) => u.role === query.role);
  if (query.customerType) list = list.filter((u) => (u.customerType || "retail") === query.customerType);
  return { list };
}));

// 取用户（脱敏）
router.get("/users/:id", internalHandler(({ params }) => {
  // 内部消费者需要完整字段（invitedBy/customerType/points 等）
  return store.get("users", params.id) || null;
}));

// 用户默认地址（下单链路用）
router.get("/addresses/:userId/default", internalHandler(({ params }) => {
  const uid = Number(params.userId);
  const a = store.findOne("addresses", (x) => x.userId === uid && x.isDefault) || store.findOne("addresses", (x) => x.userId === uid);
  return a || null;
}));

// 地址详情（按用户+ID；字面 default 已在前）
router.get("/addresses/:userId/:id", internalHandler(({ params }) => {
  const uid = Number(params.userId);
  const a = store.findOne("addresses", (x) => x.userId === uid && Number(x.id) === Number(params.id));
  return a || null;
}));

// 用户积分变动（delta 可正可负；返回新余额）
router.put("/users/:id/points", internalHandler(({ params, body }) => {
  const u = store.get("users", params.id);
  if (!u) throw new ApiError(404, 404, "用户不存在");
  const delta = Math.round(Number(body && body.delta) || 0);
  const points = Math.max(0, (u.points || 0) + delta);
  store.update("users", u.id, { points });
  return { id: u.id, points };
}));

// 角色变更（商家审核通过时提升为 merchant）
router.put("/users/:id/role", internalHandler(({ params, body }) => {
  const u = store.get("users", params.id);
  if (!u) throw new ApiError(404, 404, "用户不存在");
  const role = (body && body.role) || "user";
  const merchantId = (body && body.merchantId) || null;
  store.update("users", u.id, { role, merchantId });
  return publicUser(store.get("users", u.id));
}));

export default router;