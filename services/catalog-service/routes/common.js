import store from "../../_shared/store.js";
import { callInternal } from "../../_shared/internal-client.js";

// ---------- 币种换算（catalog 为汇率属主） ----------
export function rates() {
  const m = {};
  store.all("currencies").forEach((c) => { if (c.status === "active") m[c.code] = c.rate; });
  return m;
}

export function convert(cents, from, to) {
  if (!to || to === from) return Math.round(Number(cents) || 0);
  const r = rates();
  const fromRate = r[from] || 1;
  const toRate = r[to] || 1;
  return Math.round((Number(cents) || 0) * (toRate / fromRate));
}

export function currencySymbol(code) {
  const c = store.findOne("currencies", (x) => x.code === code);
  return c ? c.symbol : "¥";
}

// ---------- 商家名（merchant 服务为属主；本地缓存 60s） ----------
let merchantCache = null;
let merchantAt = 0;

export async function ensureMerchants() {
  if (merchantCache && Date.now() - merchantAt < 60000) return merchantCache;
  try {
    const r = await callInternal("merchant", "GET", "/internal/merchants");
    if (r && r.list) {
      merchantCache = {};
      r.list.forEach((m) => { merchantCache[m.id] = m; });
      merchantAt = Date.now();
    }
  } catch (e) {
    console.error("[catalog] merchants fetch failed:", e.message);
  }
  return merchantCache || {};
}

export function merchantMap() {
  return merchantCache || {};
}

export function merchantNameOf(merchantId) {
  const m = (merchantCache || {})[merchantId];
  return m ? m.name : "";
}

// ---------- B2B 批发阶梯价 ----------
export function tierPrice(product, quantity) {
  if (!product || !Array.isArray(product.wholesaleTiers) || !product.wholesaleTiers.length) return null;
  const q = Number(quantity) || 0;
  let best = null;
  product.wholesaleTiers
    .filter((t) => t && Number(t.minQuantity) <= q)
    .forEach((t) => {
      if (!best || Number(t.price) < best.price) best = { minQuantity: Number(t.minQuantity), price: Number(t.price) };
    });
  return best;
}

export function isWholesaleUser(user) {
  return !!(user && user.customerType === 'wholesale');
}

export function effectiveUnitPrice(product, sku, quantity, user) {
  const basePrice = sku && sku.price != null ? sku.price : (product ? product.price : 0);
  if (isWholesaleUser(user)) {
    const t = tierPrice(product, quantity);
    if (t) return t.price;
  }
  return basePrice;
}

// ---------- 商品序列化 ----------
export function serializeProduct(p, currency, opts = {}) {
  return {
    id: p.id,
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
    mainImage: p.mainImage,
    images: p.images || [],
    price: convert(p.price, "CNY", currency),
    originalPrice: convert(p.originalPrice || p.price, "CNY", currency),
    stock: p.stock,
    sales: p.sales,
    merchantId: p.merchantId,
    merchantName: merchantNameOf(p.merchantId),
    categoryId: p.categoryId,
    tags: p.tags || [],
    rating: p.rating || 0,
    isFlash: !!p.isFlash,
    flashPrice: p.flashPrice ? convert(p.flashPrice, "CNY", currency) : null,
    grouponPrice: p.grouponPrice ? convert(p.grouponPrice, "CNY", currency) : null,
    status: p.status,
    currency: currency || "CNY",
    wholesaleTiers: (opts.showTiers && Array.isArray(p.wholesaleTiers)) ? p.wholesaleTiers.map((t) => ({ minQuantity: t.minQuantity, price: convert(t.price, "CNY", currency) })) : undefined,
    createdAt: p.createdAt,
  };
}