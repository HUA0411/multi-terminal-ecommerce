import { Router } from "express";
import store from "../../_shared/store.js";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok, fail, paginate, now } from "../../_shared/util.js";

const router = Router();
router.use(auth());

function ser(a) {
  const order = store.get("orders", a.orderId);
  return { id: a.id, orderId: a.orderId, orderNo: order ? order.orderNo : "", type: a.type, reason: a.reason, amount: a.amount, currency: "CNY", status: a.status, statusText: { pending: "待处理", approved: "已同意", rejected: "已拒绝", refunded: "已退款", cancelled: "已取消" }[a.status] || a.status, merchantNote: a.merchantNote, createdAt: a.createdAt };
}

// 我的售后单
router.get("/", asyncHandler(async (req, res) => {
  const list = store.find("aftersales", (a) => a.userId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(ok(paginate(list.map(ser), req.query.page, req.query.pageSize)));
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const a = store.get("aftersales", req.params.id);
  if (!a || a.userId !== req.user.id) return fail(404, 404, "售后单不存在");
  res.json(ok(ser(a)));
}));

// 取消售后申请
router.post("/:id/cancel", asyncHandler(async (req, res) => {
  const a = store.get("aftersales", req.params.id);
  if (!a || a.userId !== req.user.id) return fail(404, 404, "售后单不存在");
  if (a.status !== "pending") return fail(400, 400, "当前状态不可取消");
  store.update("aftersales", a.id, { status: "cancelled" });
  const order = store.get("orders", a.orderId);
  if (order && order.status === "refunding") {
    store.update("orders", order.id, { status: order.paidAt ? "paid" : "pending_payment" });
  }
  res.json(ok(ser(store.get("aftersales", a.id))));
}));

export default router;
