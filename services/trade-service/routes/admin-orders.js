import { Router } from "express";
import store from "../../_shared/store.js";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok, fail, paginate, now } from "../../_shared/util.js";
import { callInternal } from "../../_shared/internal-client.js";
import { publishToUser } from "../../_shared/publisher.js";
import { auditLog } from "../../_shared/audit.js";
import { serializeOrder, ORDER_STATUS, toCsv } from "./common.js";

const router = Router();
router.use(auth("admin", "merchant"));

function assertMerchant(user, merchantId) {
  if (user.role === "merchant" && merchantId !== user.merchantId) return fail(403, 403, "无权操作其他商家资源");
}

// 订单列表
router.get("/orders", asyncHandler(async (req, res) => {
  let list = store.all("orders");
  if (req.user.role === "merchant") list = list.filter((o) => o.merchantId === req.user.merchantId);
  if (req.query.status) list = list.filter((o) => o.status === req.query.status);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(ok(paginate(list.map((o) => serializeOrder(o)), req.query.page, req.query.pageSize)));
}));

// 发货
router.post("/orders/:id/ship", asyncHandler(async (req, res) => {
  const order = store.get("orders", req.params.id);
  if (!order) return fail(404, 404, "订单不存在");
  assertMerchant(req.user, order.merchantId);
  if (order.status !== "paid") return fail(400, 400, "仅待发货订单可发货");
  const { carrier, trackingNo } = req.body || {};
  if (!carrier || !trackingNo) return fail(400, 400, "请填写物流公司和单号");
  store.update("orders", order.id, { status: "shipped", shippedAt: now() });
  auditLog(req.user, "order.ship", "order:" + order.id, { carrier, trackingNo }, req.ip);
  const ev = { time: now(), text: "【揽收】商家已发货（" + carrier + " " + trackingNo + "）" };
  const log = store.findOne("logistics", (l) => l.orderId === order.id);
  if (log) store.update("logistics", log.id, { carrier, trackingNo, status: "shipping", events: [...(log.events || []), ev] });
  else store.insert("logistics", { orderId: order.id, carrier, trackingNo, status: "shipping", events: [ev], shippedAt: now() });
  await publishToUser(order.userId, { type: "notify", data: { title: "订单已发货", body: "订单 " + order.orderNo + " 已通过 " + carrier + " 发出" } });
  res.json(ok(serializeOrder(store.get("orders", order.id))));
}));

// 售后处理（同意退款扣回积分）
router.get("/aftersales", asyncHandler(async (req, res) => {
  let list = store.all("aftersales");
  if (req.user.role === "merchant") {
    const orderIds = store.find("orders", (o) => o.merchantId === req.user.merchantId).map((o) => o.id);
    list = list.filter((a) => orderIds.includes(a.orderId));
  }
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(ok(paginate(list, req.query.page, req.query.pageSize)));
}));

router.post("/aftersales/:id/handle", asyncHandler(async (req, res) => {
  const a = store.get("aftersales", req.params.id);
  if (!a) return fail(404, 404, "售后单不存在");
  const order = store.get("orders", a.orderId);
  assertMerchant(req.user, order.merchantId);
  if (a.status !== "pending") return fail(400, 400, "售后单已处理");
  const approve = !!req.body.approve;
  const note = String(req.body.note || "").slice(0, 200);
  if (approve) {
    store.update("aftersales", a.id, { status: "refunded", merchantNote: note });
    store.update("orders", order.id, { status: "refunded" });
    store.find("payments", (p) => p.orderId === order.id && p.status === "success").forEach((p) => {
      store.update("payments", p.id, { status: "refunded" });
    });
    // 扣回已返积分（auth）
    const points = Math.floor(order.payableAmount / 100);
    await callInternal("auth", "PUT", "/internal/users/" + order.userId + "/points", { delta: -points }).catch(() => {});
    await publishToUser(order.userId, { type: "notify", data: { title: "退款成功", body: "订单 " + order.orderNo + " 已退款，金额将原路退回" } });
  } else {
    store.update("aftersales", a.id, { status: "rejected", merchantNote: note });
    store.update("orders", order.id, { status: order.paidAt ? "paid" : "pending_payment" });
    await publishToUser(order.userId, { type: "notify", data: { title: "售后未通过", body: "订单 " + order.orderNo + " 的售后申请被拒绝" + (note ? "：" + note : "") } });
  }
  res.json(ok(store.get("aftersales", a.id)));
}));

// 订单导出 CSV
router.get("/orders/export", asyncHandler(async (req, res) => {
  let list = store.all("orders");
  if (req.user.role === "merchant") list = list.filter((o) => o.merchantId === req.user.merchantId);
  if (req.query.status) list = list.filter((o) => o.status === req.query.status);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const csv = toCsv(
    ["订单号", "状态", "用户ID", "商家ID", "总金额(分)", "应付(分)", "支付方式", "创建时间", "支付时间"],
    list.map((o) => [o.orderNo, ORDER_STATUS[o.status] || o.status, o.userId, o.merchantId, o.totalAmount, o.payableAmount, o.paymentMethod || "", o.createdAt, o.paidAt || ""])
  );
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
  res.send(csv);
}));

export default router;
