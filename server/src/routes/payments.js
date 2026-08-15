import { Router } from "express";
import store from "../store.js";
import { auth } from "../middleware.js";
import { asyncHandler, ok, fail, uid, now } from "../util.js";
import { serializeOrder } from "./common.js";

const router = Router();
router.use(auth());

router.get("/methods", asyncHandler(async (req, res) => {
  res.json(ok([
    { code: "wechat", name: "微信支付" },
    { code: "alipay", name: "支付宝" },
  ]));
}));

// 沙箱模拟支付成功（生产环境由支付回调驱动，见 docs/architecture.md）
router.post("/:id/mock-success", asyncHandler(async (req, res) => {
  const payment = store.get("payments", req.params.id);
  if (!payment || payment.userId !== req.user.id) return fail(404, 404, "支付单不存在");
  if (payment.status === "success") return res.json(ok({ status: "success", already: true }));
  if (payment.status !== "pending") return fail(400, 400, "支付单状态异常");

  store.update("payments", payment.id, { status: "success", transactionNo: (payment.method === "wechat" ? "wx" : "ali") + uid(20), paidAt: now() });
  const order = store.get("orders", payment.orderId);
  if (order) {
    store.update("orders", order.id, { status: "paid", paidAt: now() });
    // 销量 + 支付返积分（1 元 = 1 分）
    const points = Math.floor(order.payableAmount / 100);
    store.update("users", order.userId, { points: (store.get("users", order.userId).points || 0) + points });
    store.insert("pointsLogs", { userId: order.userId, points, reason: `订单 ${order.orderNo} 支付返积分`, refId: order.id, createdAt: now() });
    store.find("orderItems", (i) => i.orderId === order.id).forEach((it) => {
      const p = store.get("products", it.productId);
      if (p) store.update("products", p.id, { sales: (p.sales || 0) + it.quantity });
    });
    if (req.app.locals.ws) {
      req.app.locals.ws.publishToUser(order.userId, { type: "notify", data: { title: "支付成功", body: `订单 ${order.orderNo} 支付成功，商家将尽快发货` } });
      req.app.locals.ws.publishToUser(order.userId, { type: "cart:changed", data: { totalQuantity: 0, updatedAt: now() } });
    }
  }
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