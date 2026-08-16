import config from "./config.js";
import { callInternal } from "./internal-client.js";

// ============================================================
// WebSocket 事件发布器
// - monolith：直连进程内 WS 中枢（bindWsHub）
// - micro：POST 网关 /internal/publish，由网关推给订阅客户端
// ============================================================

let hub = null;

export function bindWsHub(h) {
  hub = h;
}

export async function publish(room, event) {
  try {
    if (config.mode === "micro") {
      await callInternal("gateway", "POST", "/internal/publish", { room, event });
      return;
    }
    if (hub && hub.publish) hub.publish(room, event);
  } catch (e) {
    console.error("[publisher]", e.message);
  }
}

export async function publishToUser(userId, event) {
  await publish("cart:" + userId, event);
  await publish("notify:" + userId, event);
}
