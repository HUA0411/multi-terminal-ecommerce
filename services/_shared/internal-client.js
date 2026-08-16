import config from "./config.js";
import { REGISTRY } from "./registry.js";

// ============================================================
// 服务间调用客户端
// - micro 模式：HTTP 调目标服务 /internal/*（X-Service-Token 鉴权）
// - monolith 模式（同进程组合）：直接调用已注册的内部处理器（零网络开销）
// 内部处理器只允许访问本服务自有集合 —— 数据所有权边界
// ============================================================

const inProcess = new Map();

// 进程内路径匹配（支持 :id 参数）
function matchInProcess(method, path) {
  if (inProcess.has(method + " " + path)) return inProcess.get(method + " " + path);
  const segs = path.split("/").filter(Boolean);
  for (const [key, handler] of inProcess) {
    const sp = key.indexOf(" ");
    if (key.slice(0, sp) !== method) continue;
    const ksegs = key.slice(sp + 1).split("/").filter(Boolean);
    if (ksegs.length !== segs.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < segs.length; i++) {
      if (ksegs[i].startsWith(":")) params[ksegs[i].slice(1)] = decodeURIComponent(segs[i]);
      else if (ksegs[i] !== segs[i]) { ok = false; break; }
    }
    if (ok) return (ctx) => handler({ ...ctx, params });
  }
  return null;
}

export function registerInternal(method, path, handler) {
  inProcess.set(method.toUpperCase() + " " + path, handler);
}

export async function callInternal(service, method, path, body, query) {
  const meta = REGISTRY[service];
  if (!meta) throw new Error("unknown service: " + service);
  if (config.mode !== "micro" || service === config.serviceName) {
    const handler = matchInProcess(method.toUpperCase(), path);
    if (handler) {
      const data = handler({ body: body || null, query: query || {} });
      return data !== undefined ? data : null;
    }
    // 未注册到进程内映射（如服务自调用）时回退本地 HTTP
  }
  const qs = query && Object.keys(query).length
    ? "?" + Object.keys(query).map((k) => k + "=" + encodeURIComponent(query[k])).join("&")
    : "";
  const base = service === "gateway" ? config.gatewayUrl : "http://127.0.0.1:" + meta.port;
  const res = await fetch(base + path + qs, {
    method,
    headers: {
      "content-type": "application/json",
      "x-service-token": config.serviceToken,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.code !== 0) {
    throw new Error("svc " + service + " " + method + " " + path + " -> " + (json ? json.message : "http " + res.status));
  }
  return json.data;
}