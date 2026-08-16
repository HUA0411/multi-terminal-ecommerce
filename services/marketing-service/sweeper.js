import store from "../_shared/store.js";
import config from "../_shared/config.js";
import { now } from "../_shared/util.js";
import { callInternal } from "../_shared/internal-client.js";

// 拼团超时扫描：到期未满员 -> 成团失败 + 取消团员待支付订单（trade 回补库存）
let timer = null;

export function startGrouponSweeper(intervalMs) {
  intervalMs = intervalMs || config.sweeperIntervalMs;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    try {
      const failed = sweep();
      if (failed.length) console.log("[sweeper] 拼团超时失败: " + failed.join(", "));
    } catch (e) {
      console.error("[sweeper] error:", e.message);
    }
  }, intervalMs);
  if (typeof timer.unref === "function") timer.unref();
}

export function sweep() {
  const overdue = store.find("groupons", (g) => g.status === "open" && Date.now() > new Date(g.deadline).getTime());
  const failed = [];
  for (const g of overdue) {
    store.update("groupons", g.id, { status: "failed", failedAt: now() });
    // 取消团员待支付订单（trade）
    callInternal("trade", "GET", "/internal/orders/query", null, { grouponId: g.id, status: "pending_payment" }).then((r) => {
      ((r && r.list) || []).forEach((o) => {
        callInternal("trade", "POST", "/internal/orders/cancel", { orderId: o.id }).catch(() => {});
      });
    }).catch(() => {});
    failed.push(g.grouponNo);
  }
  return failed;
}

export function stopGrouponSweeper() {
  if (timer) { clearInterval(timer); timer = null; }
}
