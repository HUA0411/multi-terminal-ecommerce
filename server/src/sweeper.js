import store from "./store.js";
import config from "./config.js";
import { now } from "./util.js";

// ============================================================
// 订单超时自动取消（模拟消息队列延迟任务：周期扫描 + 幂等处理）
// - 待付款订单超过 orderTimeoutMinutes 自动取消
// - 回补商品/SKU 库存、退回优惠券、释放秒杀名额
// 生产环境可替换为 Redis 延迟队列（架构预留）
// ============================================================

let timer = null;

export function startOrderSweeper(intervalMs) {
  intervalMs = intervalMs || config.sweeperIntervalMs;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    try {
      const cancelled = sweep();
      if (cancelled.length) console.log("[sweeper] 自动取消超时订单: " + cancelled.join(", "));
    } catch (e) {
      console.error("[sweeper] error:", e.message);
    }
  }, intervalMs);
  if (typeof timer.unref === "function") timer.unref();
  console.log("[sweeper] 订单超时扫描已启动（" + config.orderTimeoutMinutes + " 分钟，每 " + intervalMs + "ms）");
}

export function sweep() {
  const ttlMs = config.orderTimeoutMinutes * 60_000;
  const deadline = Date.now() - ttlMs;
  const cancelled = [];
  const pending = store.find("orders", (o) => o.status === "pending_payment" && o.flashSaleId == null);
  for (const order of pending) {
    const created = new Date(order.createdAt).getTime();
    if (created > deadline) continue;
    doCancel(order);
    cancelled.push(order.orderNo);
  }
  // 秒杀未支付订单：单独超时（同一 TTL），释放名额
  const pendingFlash = store.find("orders", (o) => o.status === "pending_payment" && o.flashSaleId != null);
  for (const order of pendingFlash) {
    const created = new Date(order.createdAt).getTime();
    if (created > deadline) continue;
    doCancel(order, true);
    cancelled.push(order.orderNo + "(秒杀)");
  }
  return cancelled;
}

function doCancel(order, isFlash) {
  // 回补库存
  store.find("orderItems", (i) => i.orderId === order.id).forEach((it) => {
    const sku = store.get("productSkus", it.skuId);
    if (sku) store.update("productSkus", sku.id, { stock: sku.stock + it.quantity });
    const p = store.get("products", it.productId);
    if (p) store.update("products", p.id, { stock: p.stock + it.quantity });
  });
  // 退回优惠券
  if (order.couponId) {
    const uc = store.findOne("userCoupons", (c) => c.couponId === order.couponId && c.userId === order.userId && c.status === "used" && c.orderId === order.id);
    if (uc) store.update("userCoupons", uc.id, { status: "unused", usedAt: null, orderId: null });
  }
  // 释放秒杀名额
  if (isFlash && order.flashSaleId) {
    const fs = store.get("flashSales", order.flashSaleId);
    if (fs && fs.sold > 0) store.update("flashSales", fs.id, { sold: fs.sold - 1 });
  }
  store.update("orders", order.id, { status: "cancelled", cancelledAt: now() });
  const user = store.get("users", order.userId);
  if (user) {
    store.insert("notifications", { userId: user.id, title: "订单超时已取消", body: "订单 " + order.orderNo + " 超时未支付已自动取消，库存已释放", read: false, createdAt: now() });
  }
}

export function stopOrderSweeper() {
  if (timer) { clearInterval(timer); timer = null; }
}