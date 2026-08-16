import { Router } from "express";
import store from "../../_shared/store.js";
import { internalHandler } from "../../_shared/app-factory.js";
import { ApiError } from "../../_shared/util.js";

const router = Router();

// 优惠券详情
router.get("/coupons/:id", internalHandler(({ params }) => {
  return store.get("coupons", params.id) || null;
}));

// 用户优惠券查找（下单校验用）
router.get("/user-coupons/find", internalHandler(({ query }) => {
  const uc = store.findOne("userCoupons", (c) =>
    Number(c.id) === Number(query.id) && Number(c.userId) === Number(query.userId) && (!query.status || c.status === query.status));
  return uc || null;
}));

// 优惠券标记已使用
router.put("/user-coupons/:id/use", internalHandler(({ params, body }) => {
  const uc = store.get("userCoupons", params.id);
  if (!uc) throw new ApiError(404, 404, "用户优惠券不存在");
  store.update("userCoupons", uc.id, { status: "used", usedAt: new Date().toISOString(), orderId: (body && body.orderId) || null });
  return store.get("userCoupons", uc.id);
}));

// 优惠券退回（订单取消）
router.put("/user-coupons/:id/return", internalHandler(({ params }) => {
  const uc = store.get("userCoupons", params.id);
  if (!uc) throw new ApiError(404, 404, "用户优惠券不存在");
  store.update("userCoupons", uc.id, { status: "unused", usedAt: null, orderId: null });
  return store.get("userCoupons", uc.id);
}));

// 积分流水写入
router.post("/points/logs", internalHandler(({ body }) => {
  const log = store.insert("pointsLogs", {
    userId: Number(body && body.userId) || 0,
    points: Math.round(Number(body && body.points) || 0),
    reason: String((body && body.reason) || "").slice(0, 200),
    refId: (body && body.refId) || null,
    createdAt: new Date().toISOString(),
  });
  return { id: log.id };
}));

// 秒杀列表（CMS 渲染用；可选 status 过滤）
router.get("/flashsales", internalHandler(({ query }) => {
  let list = store.all("flashSales");
  if (query.status) list = list.filter((f) => f.status === query.status);
  return { list };
}));

// 秒杀活动详情
router.get("/flashsales/:id", internalHandler(({ params }) => {
  return store.get("flashSales", params.id) || null;
}));

// 秒杀名额累加/回退
router.post("/flashsales/:id/sold", internalHandler(({ params, body }) => {
  const fs = store.get("flashSales", params.id);
  if (!fs) throw new ApiError(404, 404, "秒杀活动不存在");
  const delta = Math.round(Number(body && body.delta) || 0);
  store.update("flashSales", fs.id, { sold: Math.max(0, (fs.sold || 0) + delta) });
  return store.get("flashSales", fs.id);
}));

// 分享链接查询（注册邀请码校验）
router.get("/shares/find", internalHandler(({ query }) => {
  return store.findOne("shares", (s) => s.code === query.code) || null;
}));

// 拼团详情/进行中列表（CMS 渲染用）
router.get("/groupons/:id", internalHandler(({ params }) => {
  return store.get("groupons", params.id) || null;
}));

router.get("/groupons", internalHandler(({ query }) => {
  const status = query.status || "open";
  const list = store.find("groupons", (g) => g.status === status).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { list };
}));

export default router;