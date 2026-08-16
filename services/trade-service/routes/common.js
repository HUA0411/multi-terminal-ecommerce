import store from "../../_shared/store.js";
import { convert, ensureRates } from "../../_shared/currency.js";

export { ensureRates };

export const ORDER_STATUS = {
  pending_payment: "待付款",
  paid: "待发货",
  shipped: "待收货",
  completed: "已完成",
  cancelled: "已取消",
  refunding: "退款中",
  refunded: "已退款",
};

export function serializeOrder(order, currency) {
  const items = store.find("orderItems", (i) => i.orderId === order.id);
  const track = store.findOne("logistics", (l) => l.orderId === order.id);
  const pays = store.find("payments", (p) => p.orderId === order.id);
  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    statusText: ORDER_STATUS[order.status] || order.status,
    totalAmount: convert(order.totalAmount, "CNY", currency),
    discountAmount: convert(order.discountAmount || 0, "CNY", currency),
    couponId: order.couponId || null,
    couponAmount: convert(order.couponAmount || 0, "CNY", currency),
    payableAmount: convert(order.payableAmount, "CNY", currency),
    currency: currency || order.currency || "CNY",
    paymentMethod: order.paymentMethod || null,
    address: order.address,
    remark: order.remark || "",
    items: items.map((it) => ({ id: it.id, productId: it.productId, productName: it.productName, skuName: it.skuName, image: it.image, price: convert(it.price, "CNY", currency), quantity: it.quantity, subtotal: convert(it.subtotal, "CNY", currency) })),
    tracking: track ? { carrier: track.carrier, trackingNo: track.trackingNo, status: track.status, events: track.events || [] } : null,
    payments: pays.map((p) => ({ id: p.id, method: p.method, amount: convert(p.amount, "CNY", currency), status: p.status, transactionNo: p.transactionNo, createdAt: p.createdAt, paidAt: p.paidAt })),
    merchantId: order.merchantId,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    shippedAt: order.shippedAt,
    completedAt: order.completedAt,
  };
}

// CSV 导出（带 BOM，Excel 兼容）
export function toCsv(headers, rows) {
  const esc = (v) => {
    const s = String(v === null || v === undefined ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return "\uFEFF" + [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

// B2B 批发阶梯价（商品数据来自 catalog 快照）
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