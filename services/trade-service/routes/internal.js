import { Router } from "express";
import store from "../../_shared/store.js";
import { internalHandler } from "../../_shared/app-factory.js";
import { ApiError, orderNo, now } from "../../_shared/util.js";
import { callInternal } from "../../_shared/internal-client.js";

const router = Router();

// 订单查询（营销/看板/商家跨域读取）
router.get("/orders/query", internalHandler(({ query }) => {
  let list = store.all("orders");
  if (query.id) list = list.filter((o) => Number(o.id) === Number(query.id));
  if (query.userId) list = list.filter((o) => Number(o.userId) === Number(query.userId));
  if (query.merchantId) list = list.filter((o) => Number(o.merchantId) === Number(query.merchantId));
  if (query.flashSaleId) list = list.filter((o) => Number(o.flashSaleId) === Number(query.flashSaleId));
  if (query.grouponId) list = list.filter((o) => Number(o.grouponId) === Number(query.grouponId));
  if (query.status) {
    const statuses = String(query.status).split(",").map((s) => s.trim()).filter(Boolean);
    list = list.filter((o) => statuses.includes(o.status));
  }
  if (query.from) list = list.filter((o) => new Date(o.createdAt) >= new Date(query.from));
  if (query.to) list = list.filter((o) => new Date(o.createdAt) <= new Date(query.to));
  list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return { list };
}));

// 订单项批量查询（推荐/协同过滤）
router.get("/order-items", internalHandler(({ query }) => {
  const orderIds = String(query.orderIds || "").split(",").map((s) => Number(s.trim())).filter(Boolean);
  const list = store.find("orderItems", (i) => orderIds.includes(Number(i.orderId)));
  return { list };
}));

// 购买校验（评价资格：订单已完成且含该商品）
router.get("/purchase-check", internalHandler(({ query }) => {
  const userId = Number(query.userId);
  const productId = Number(query.productId);
  const item = store.find("orderItems", (i) => Number(i.productId) === productId).find((i) => {
    const o = store.get("orders", i.orderId);
    return o && Number(o.userId) === userId && o.status === "completed";
  });
  return { bought: !!item };
}));

// 订单聚合（看板）
router.get("/orders/aggregate", internalHandler(({ query }) => {
  let list = store.all("orders");
  if (query.merchantId) list = list.filter((o) => Number(o.merchantId) === Number(query.merchantId));
  if (query.from) list = list.filter((o) => new Date(o.createdAt) >= new Date(query.from));
  if (query.to) list = list.filter((o) => new Date(o.createdAt) <= new Date(query.to));
  const paid = list.filter((o) => ["paid", "shipped", "completed", "refunding"].includes(o.status));
  const refunded = list.filter((o) => o.status === "refunded");
  const gmv = paid.reduce((s, o) => s + o.payableAmount, 0);
  return {
    orderCount: list.length,
    paidCount: paid.length,
    gmv,
    refundCount: refunded.length,
    refundRate: list.length ? Math.round((refunded.length / list.length) * 10000) / 100 : 0,
  };
}));

// 跨服务取消订单（拼团超时等；回补库存/退券）
router.post("/orders/cancel", internalHandler(async ({ body }) => {
  const order = store.get("orders", body && body.orderId);
  if (!order || order.status !== "pending_payment") return { cancelled: false };
  store.find("orderItems", (i) => i.orderId === order.id).forEach((it) => {
    callInternal("catalog", "POST", "/internal/skus/" + it.skuId + "/stock", { delta: it.quantity }).catch(() => {});
  });
  if (order.couponId) {
    const uc = await callInternal("marketing", "GET", "/internal/user-coupons/find", null, { id: order.couponId, userId: order.userId, status: "used" }).catch(() => null);
    if (uc && uc.orderId === order.id) {
      await callInternal("marketing", "PUT", "/internal/user-coupons/" + uc.id + "/return").catch(() => {});
    }
  }
  store.update("orders", order.id, { status: "cancelled", cancelledAt: new Date().toISOString() });
  callInternal("platform", "POST", "/internal/notifications", { userId: order.userId, title: "拼团失败已取消订单", body: "拼团未成团，订单 " + order.orderNo + " 已取消，库存已释放" }).catch(() => {});
  return { cancelled: true };
}));

// 直落订单（秒杀/拼团/询价成交：扣库存 + 落单，事务由调用方编排）
router.post("/orders/direct", internalHandler(async ({ body }) => {
  const b = body || {};
  const items = Array.isArray(b.items) ? b.items : [];
  if (!b.userId || !items.length) throw new ApiError(400, 400, "参数不完整");
  // 库存校验并扣减（catalog；SKU 联动商品总库存）
  for (const it of items) {
    const r = await callInternal("catalog", "GET", "/internal/skus/" + it.skuId).catch(() => null);
    const sku = r ? r.sku : null;
    if (!sku || sku.stock < it.quantity) throw new ApiError(400, 400, "「" + (it.productName || "商品") + "」库存不足");
    await callInternal("catalog", "POST", "/internal/skus/" + it.skuId + "/stock", { delta: -it.quantity }).catch(() => {});
  }
  const order = store.insert("orders", {
    orderNo: orderNo(),
    userId: Number(b.userId),
    merchantId: Number(b.merchantId) || 1,
    status: "pending_payment",
    totalAmount: Number(b.totalAmount) || 0,
    discountAmount: Number(b.discountAmount) || 0,
    couponId: b.couponId || null,
    couponAmount: Number(b.couponAmount) || 0,
    payableAmount: Number(b.payableAmount) || 0,
    currency: b.currency || "CNY",
    paymentMethod: null,
    flashSaleId: b.flashSaleId || null,
    grouponId: b.grouponId || null,
    quoteId: b.quoteId || null,
    address: b.address || { name: "", phone: "", detail: "" },
    remark: b.remark || "",
    paidAt: null, shippedAt: null, completedAt: null,
  });
  items.forEach((it) => {
    store.insert("orderItems", {
      orderId: order.id,
      productId: Number(it.productId),
      skuId: Number(it.skuId),
      productName: String(it.productName || ""),
      skuName: String(it.skuName || ""),
      image: it.image || "",
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 1,
      subtotal: (Number(it.price) || 0) * (Number(it.quantity) || 1),
    });
  });
  return store.get("orders", order.id);
}));

export default router;