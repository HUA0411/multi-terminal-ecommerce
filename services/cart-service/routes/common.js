import store from "../../_shared/store.js";
import { callInternal } from "../../_shared/internal-client.js";

// 商品/SKU 只读缓存（catalog 为属主；TTL 60s 惰性刷新）
const skuCache = new Map();
const cacheAt = new Map();

export async function ensureSku(skuId) {
  const id = Number(skuId);
  if (skuCache.has(id) && Date.now() - (cacheAt.get(id) || 0) < 60000) return skuCache.get(id);
  try {
    const r = await callInternal("catalog", "GET", "/internal/skus/" + id);
    if (r && r.sku) { skuCache.set(id, r); cacheAt.set(id, Date.now()); }
    return r || null;
  } catch {
    return skuCache.get(id) || null;
  }
}

export function skuOf(skuId) {
  return skuCache.get(Number(skuId)) || null;
}

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

import { convert, ensureRates } from "../../_shared/currency.js";

export { ensureRates };

export function effectiveUnitPrice(product, sku, quantity, user) {
  const basePrice = sku && sku.price != null ? sku.price : (product ? product.price : 0);
  if (isWholesaleUser(user)) {
    const t = tierPrice(product, quantity);
    if (t) return t.price;
  }
  return basePrice;
}

// 购物车汇总（同步；依赖 ensureSku 预热的缓存）
export function cartSummary(userId, currency, user) {
  const items = store
    .find("cartItems", (c) => c.userId === userId)
    .map((c) => {
      const hit = skuOf(c.skuId);
      const sku = hit ? hit.sku : null;
      const product = hit ? hit.product : null;
      return {
        id: c.id,
        skuId: c.skuId,
        productId: sku ? sku.productId : null,
        productName: product ? product.name : "",
        skuName: sku ? sku.name : "",
        image: product ? product.mainImage : "",
        price: convert(effectiveUnitPrice(product, sku, c.quantity, user), "CNY", currency),
        unitPrice: convert(sku ? sku.price : 0, "CNY", currency),
        wholesale: isWholesaleUser(user) ? !!tierPrice(product, c.quantity) : false,
        quantity: c.quantity,
        checked: !!c.checked,
        stock: sku ? sku.stock : 0,
        currency: currency || "CNY",
      };
    });
  const checked = items.filter((i) => i.checked);
  return {
    items,
    totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
    checkedQuantity: checked.reduce((s, i) => s + i.quantity, 0),
    totalPrice: checked.reduce((s, i) => s + i.price * i.quantity, 0),
  };
}