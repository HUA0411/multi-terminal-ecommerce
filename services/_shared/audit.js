import config from "./config.js";
import store from "./store.js";
import { callInternal } from "./internal-client.js";

// 审计日志：platform 服务为属主；其他服务经内部接口写入（失败不影响主流程）
export async function auditLog(user, action, target, detail, ip) {
  const evt = {
    adminId: user ? user.id : null,
    adminName: user ? (user.nickname || "") : "",
    action, target: target || "",
    detail: detail || {},
    ip: ip || "",
    createdAt: new Date().toISOString(),
  };
  try {
    if (config.ownedCollections.includes("auditLogs")) {
      store.insert("auditLogs", evt);
    } else {
      await callInternal("platform", "POST", "/internal/audit", evt).catch(() => {});
    }
  } catch {}
}
