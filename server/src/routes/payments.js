import { Router } from "express";
import crypto from "node:crypto";
import config from "../config.js";
import { now as _now } from "../util.js";
import store from "../store.js";
import { auth } from "../middleware.js";
import { asyncHandler, ok, fail, uid, now } from "../util.js";
import { serializeOrder, pushDashboard } from "./common.js";

const router = Router();
// ---------- 微信 / 支付宝异步支付回调（生产对接入口） ----------
// 真实流程：支付平台回调本端点 -> 验签 -> 更新支付单与订单状态 -> 返回 "success"
router.post("/callback/:channel", asyncHandler(async (req, res) => {
  const channel = req.params.channel;
  const secret = channel === "alipay" ? config.paymentSecrets.alipay : config.paymentSecrets.wechat;
  const payload = req.body || {};
  const expectSign = String(payload.sign || "");
  if (!expectSign) return fail(400, 400, "缺少签名");
  const calcSign = callbackSign(payload, secret);
  if (!safeEqual(expectSign, calcSign)) {
    store.insert("riskEvents", { userId: null, type: "pay_callback_bad_sign", level: "high", detail: { channel, reason: "回调验签失败" }, ip: req.ip, createdAt: now() });
    return fail(401, 401, "签名校验失败");
  }
  const payment = store.get("payments", payload.paymentId);
  if (!payment || payment.method !== channel) return fail(404, 404, "支付单不存在或渠道不符");
  if (Number(payload.amount) !== payment.amount) return fail(400, 400, "金额不一致");
  markPaid(payment.id, String(payload.transactionNo || "").slice(0, 64) || undefined, req);
  res.send("success");
}));

router.use(auth());

router.get("/methods", asyncHandler(async (req, res) => {
  res.json(ok([
    { code: "wechat", name: "微信支付" },
    { code: "alipay", name: "支付宝" },
  ]));
}));

// ============ 支付状态推进（mock-success 与异步回调共用） ============
function markPaid(paymentId, transactionNo, req) {
  const payment = store.get("payments", paymentId);
  if (!payment) return null;
  if (payment.status === "success") return payment;
  if (payment.status !== "pending") return payment;
  store.update("payments", payment.id, { status: "success", transactionNo: transactionNo || (payment.method === "wechat" ? "wx" : "ali") + uid(20), paidAt: now() });
  const order = store.get("orders", payment.orderId);
  if (order) {
    store.update("orders", order.id, { status: "paid", paidAt: now() });
    const points = Math.floor(order.payableAmount / 100);
    const buyer = store.get("users", order.userId);
    if (buyer) store.update("users", order.userId, { points: (buyer.points || 0) + points });
    store.insert("pointsLogs", { userId: order.userId, points, reason: "订单 " + order.orderNo + " 支付返积分", refId: order.id, createdAt: now() });
    store.find("orderItems", (i) => i.orderId === order.id).forEach((it) => {
      const prod = store.get("products", it.productId);
      if (prod) store.update("products", prod.id, { sales: (prod.sales || 0) + it.quantity });
    });
    // 邀请裂变：被邀请人首单支付 -> 邀请人得积分
    try {
      const buyer = store.get("users", order.userId);
      const firstPaid = !store.find("orders", (o) => o.userId === order.userId && o.id !== order.id && ["paid", "shipped", "completed"].includes(o.status)).length;
      if (buyer && buyer.invitedBy && firstPaid) {
        const inviter = store.get("users", buyer.invitedBy);
        if (inviter) {
          const reward = config.inviteRewardPoints;
          store.update("users", inviter.id, { points: (inviter.points || 0) + reward });
          store.insert("pointsLogs", { userId: inviter.id, points: reward, reason: "邀请好友下单奖励（" + (buyer.nickname || "新用户") + "）", refId: order.id, createdAt: new Date().toISOString() });
          if (req && req.app.locals.ws) req.app.locals.ws.publishToUser(inviter.id, { type: "notify", data: { title: "邀请奖励到账", body: "好友下单，获得 " + reward + " 积分奖励" } });
        }
      }
    } catch (e) { console.error("[invite] reward error:", e.message); }
    if (req && req.app.locals.ws) {
      req.app.locals.ws.publishToUser(order.userId, { type: "notify", data: { title: "支付成功", body: "订单 " + order.orderNo + " 支付成功，商家将尽快发货" } });
    }
    pushDashboard(req, "dashboard:changed", { action: "order.paid", orderId: order.id, amount: order.payableAmount });
  }
  return store.get("payments", payment.id);
}

// 回调签名（HMAC-SHA256；生产环境微信为 MD5/HMAC、支付宝为 RSA，此处统一脚手架）
function callbackSign(payload, secret) {
  const canon = Object.keys(payload).filter((k) => k !== "sign").sort().map((k) => k + "=" + payload[k]).join("&");
  return crypto.createHmac("sha256", secret).update(canon).digest("hex");
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// 沙箱模拟支付成功（生产环境由支付回调驱动）
router.post("/:id/mock-success", asyncHandler(async (req, res) => {
  const payment = store.get("payments", req.params.id);
  if (!payment || payment.userId !== req.user.id) return fail(404, 404, "支付单不存在");
  if (payment.status === "success") return res.json(ok({ status: "success", already: true }));
  if (payment.status !== "pending") return fail(400, 400, "支付单状态异常");
  markPaid(payment.id, undefined, req);
  res.json(ok({ status: "success", payment: store.get("payments", payment.id) }));
}));

// 查询支付单
router.get("/:id", asyncHandler(async (req, res) => {
  const payment = store.get("payments", req.params.id);
  if (!payment || payment.userId !== req.user.id) return fail(404, 404, "支付单不存在");
  const order = store.get("orders", payment.orderId);
  res.json(ok({ ...payment, orderStatus: order ? order.status : null, order: order ? serializeOrder(order) : null }));
}));

export default router;