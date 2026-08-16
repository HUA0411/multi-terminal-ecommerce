import { callInternal } from "./internal-client.js";

// ============================================================
// 币种汇率：catalog 服务为属主；其他服务通过内部接口取汇率并本地缓存（TTL 60s）
// CNY 场景无需调用（默认汇率 1:1）—— 大多数请求零额外开销
// ============================================================

let cache = null;
let cacheAt = 0;

export async function ensureRates() {
  if (cache && Date.now() - cacheAt < 60000) return cache;
  try {
    const r = await callInternal("catalog", "GET", "/internal/rates");
    if (r) { cache = r; cacheAt = Date.now(); }
  } catch (e) {
    console.error("[currency] rates fetch failed:", e.message);
  }
  return cache || {};
}

export function ratesSync() {
  return cache || {};
}

// cents: 基础币种金额（分）-> 目标币种金额（分，取整）；缓存未就绪时按 1:1
export function convert(cents, from, to) {
  if (!to || to === from) return Math.round(Number(cents) || 0);
  const r = ratesSync();
  const fromRate = r[from] || 1;
  const toRate = r[to] || 1;
  return Math.round((Number(cents) || 0) * (toRate / fromRate));
}
