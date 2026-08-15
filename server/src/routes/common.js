import store from "../store.js";

// ---------- 币种换算 ----------
export function rates() {
  const m = {};
  store.all("currencies").forEach((c) => { if (c.status === "active") m[c.code] = c.rate; });
  return m;
}

// cents: 基础币种金额（分）-> 目标币种金额（分，取整）
export function convert(cents, from, to) {
  if (!to || to === from) return Math.round(Number(cents) || 0);
  const r = rates();
  const fromRate = r[from] || 1;
  const toRate = r[to] || 1;
  return Math.round((Number(cents) || 0) * (toRate / fromRate));
}

// ---------- B2B 批发阶梯价 ----------
// product.wholesaleTiers: [{minQuantity, price}]（price 为分），按数量取最优档
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

// 用户是否为批发客户（B2B）
export function isWholesaleUser(user) {
  return !!(user && user.customerType === 'wholesale');
}

// 实际成交单价：批发客户按阶梯价，否则原价
export function effectiveUnitPrice(product, sku, quantity, user) {
  const basePrice = sku && sku.price != null ? sku.price : (product ? product.price : 0);
  if (isWholesaleUser(user)) {
    const t = tierPrice(product, quantity);
    if (t) return t.price;
  }
  return basePrice;
}

export function currencySymbol(code) {
  const c = store.findOne("currencies", (x) => x.code === code);
  return c ? c.symbol : "¥";
}

// ---------- 商品序列化 ----------
export function serializeProduct(p, currency, opts = {}) {
  const merchant = store.get("merchants", p.merchantId);
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
    merchantName: merchant ? merchant.name : "",
    categoryId: p.categoryId,
    tags: p.tags || [],
    rating: p.rating || 0,
    isFlash: !!p.isFlash,
    flashPrice: p.flashPrice ? convert(p.flashPrice, "CNY", currency) : null,
    status: p.status,
    currency: currency || "CNY",
    wholesaleTiers: (opts.showTiers && Array.isArray(p.wholesaleTiers)) ? p.wholesaleTiers.map((t) => ({ minQuantity: t.minQuantity, price: convert(t.price, "CNY", currency) })) : undefined,
    createdAt: p.createdAt,
  };
}

// ---------- 订单序列化 ----------
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

// ---------- 购物车汇总 ----------
export function cartSummary(userId, currency, user) {
  const items = store
    .find("cartItems", (c) => c.userId === userId)
    .map((c) => {
      const sku = store.get("productSkus", c.skuId);
      const product = sku ? store.get("products", sku.productId) : null;
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

// ---------- 看板实时推送（管理端 WS 订阅 "dashboard"） ----------
export function pushDashboard(req, event = "dashboard:changed", data = {}) {
  try {
    if (req && req.app && req.app.locals.ws && req.app.locals.ws.publish) {
      req.app.locals.ws.publish("dashboard", { type: event, data: { ts: new Date().toISOString(), ...data } });
    }
  } catch { /* 忽略 */ }
}

// ---------- 通知 ----------
export function notifyUser(userId, title, body) {
  store.insert("notifications", { userId, title, body, read: false, createdAt: new Date().toISOString() });
  return { userId, title, body };
}