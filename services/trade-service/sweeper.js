import store from "../_shared/store.js";
import config from "../_shared/config.js";
import { now } from "../_shared/util.js";
import { callInternal } from "../_shared/internal-client.js";

// 订单超时自动取消（模拟延迟队列：周期扫描 + 幂等；生产可替换 Redis 延迟队列）
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
  const ttlMs = config.orderTimeoutMinutes * 60000;
  const deadline = Date.now() - ttlMs;
  const cancelled = [];
  const pending = store.find("orders", (o) => o.status === "pending_payment" && o.flashSaleId == null);
  for (const order of pending) {
    const created = new Date(order.createdAt).getTime();
    if (created > deadline) continue;
    doCancel(order, false);
    cancelled.push(order.orderNo);
  }
  const pendingFlash = store.find("orders", (o) => o.status === "pending_payment" && o.flashSaleId != null);
  for (const order of pendingFlash) {
    const created = new Date(order.createdAt).getTime();
    if (created > deadline) continue;
    doCancel(order, true);
    cancelled.push(order.orderNo + "(秒杀)");
  }
  return cancelled;
}

async function doCancel(order, isFlash) {
  // 回补库存（catalog）
  store.find("orderItems", (i) => i.orderId === order.id).forEach((it) => {
    callInternal("catalog", "POST", "/internal/skus/" + it.skuId + "/stock", { delta: it.quantity }).catch(() => {});
  });
  // 退回优惠券（marketing）
  if (order.couponId) {
    callInternal("marketing", "GET", "/internal/user-coupons/find", null, { id: order.couponId, userId: order.userId, status: "used" }).then((uc) => {
      if (uc && uc.orderId === order.id) callInternal("marketing", "PUT", "/internal/user-coupons/" + uc.id + "/return").catch(() => {});
    }).catch(() => {});
  }
  // 释放秒杀名额（marketing）
  if (isFlash && order.flashSaleId) {
    callInternal("marketing", "POST", "/internal/flashsales/" + order.flashSaleId + "/sold", { delta: -1 }).catch(() => {});
  }
  store.update("orders", order.id, { status: "cancelled", cancelledAt: now() });
  // 通知（platform）
  callInternal("platform", "POST", "/internal/notifications", { userId: order.userId, title: "订单超时已取消", body: "订单 " + order.orderNo + " 超时未支付已自动取消，库存已释放" }).catch(() => {});
}

export function stopOrderSweeper() {
  if (timer) { clearInterval(timer); timer = null; }
}
