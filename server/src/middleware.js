import config from "./config.js";
import { verifyToken, publicUser, fail } from "./util.js";
import store from "./store.js";

// ---------- JWT 认证 ----------
export function auth(...roles) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return fail(401, 401, "未登录");
    try {
      const payload = verifyToken(token);
      const user = store.get("users", payload.id);
      if (!user || user.status !== "active") return fail(401, 401, "账号不可用");
      req.user = user;
      req.userPayload = payload;
      if (roles.length && !roles.includes(user.role)) return fail(403, 403, "无权限");
      next();
    } catch {
      return fail(401, 401, "登录已过期");
    }
  };
}

// 可选认证：有有效 token 则挂载 req.user，无 token 也放行（用于公开接口的个性化）
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      const payload = verifyToken(token);
      const user = store.get("users", payload.id);
      if (user && user.status === "active") req.user = user;
    } catch {}
  }
  next();
}

// ---------- 简易频控（内存版；生产替换为 Redis 滑动窗口） ----------
const buckets = new Map();
export function rateLimit({ windowMs = 60_000, max = 60, keyOf = (req) => req.ip, name = "default" } = {}) {
  return (req, res, next) => {
    const key = name + ":" + keyOf(req) + ":" + (req.user ? req.user.id : "");
    const nowT = Date.now();
    const arr = (buckets.get(key) || []).filter((t) => nowT - t < windowMs);
    if (arr.length >= max) {
      store.insert("riskEvents", { userId: req.user ? req.user.id : null, type: name + "_rate_limit", level: "high", detail: { reason: "频控触发", key }, ip: req.ip, createdAt: new Date().toISOString() });
      return fail(429, 429, "操作过于频繁，请稍后再试");
    }
    arr.push(nowT);
    buckets.set(key, arr);
    next();
  };
}

// ---------- 请求日志 ----------
export function requestLog(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`[api] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}

// ---------- 简单缓存层（内存 TTL；生产替换为 Redis get/set） ----------
const cacheMap = new Map();
export const cache = {
  async get(key) {
    const hit = cacheMap.get(key);
    if (hit && hit.expire > Date.now()) return hit.value;
    if (hit) cacheMap.delete(key);
    return null;
  },
  async set(key, value, ttlMs = 30_000) {
    cacheMap.set(key, { value, expire: Date.now() + ttlMs });
  },
  async del(key) {
    cacheMap.delete(key);
  },
  async delPrefix(prefix) {
    for (const k of [...cacheMap.keys()]) if (k.startsWith(prefix)) cacheMap.delete(k);
  },
};

// ---------- 轻量任务队列（内存版；生产替换为 Redis + BullMQ，见 docs/architecture.md） ----------
const queues = new Map();
export const queue = {
  add(name, job) {
    const q = queues.get(name) || [];
    q.push(job);
    queues.set(name, q);
    // 异步消费
    queueMicrotask(async () => {
      const item = q.shift();
      if (item) {
        try { await item(); } catch (e) { console.error("[queue] job failed:", e.message); }
      }
    });
  },
  stats() {
    return Object.fromEntries([...queues.entries()].map(([k, v]) => [k, v.length]));
  },
};

export { publicUser };