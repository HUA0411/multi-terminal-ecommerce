import { Router } from "express";
import store from "../store.js";
import { auth } from "../middleware.js";
import { asyncHandler, ok } from "../util.js";
import config from "../config.js";

const router = Router();

function scopeOrders(user) {
  const all = store.all("orders");
  if (user.role === "merchant") return all.filter((o) => o.merchantId === user.merchantId);
  return all;
}

function buildOverview(orders, wsOnline) {
  const paid = orders.filter((o) => ["paid", "shipped", "completed", "refunding"].includes(o.status));
  const gmv = paid.reduce((s, o) => s + o.payableAmount, 0);
  const todayKey = new Date().toISOString().slice(0, 10);
  const today = orders.filter((o) => (o.createdAt || "").slice(0, 10) === todayKey);
  const todayPaid = paid.filter((o) => (o.paidAt || "").slice(0, 10) === todayKey);
  return {
    gmv,
    orderCount: orders.length,
    userCount: store.count("users", (u) => u.role === "user"),
    productCount: store.count("products", (p) => p.status === "on"),
    conversionRate: orders.length ? Math.round((paid.length / orders.length) * 1000) / 10 : 0,
    avgOrderValue: paid.length ? Math.round(gmv / paid.length) : 0,
    todayGmv: todayPaid.reduce((s, o) => s + o.payableAmount, 0),
    todayOrders: today.length,
    // 运营健康度
    refundRate: paid.length ? Math.round((orders.filter((o) => o.status === "refunded" || o.status === "refunding").length / paid.length) * 1000) / 10 : 0,
    lowStockCount: store.count("products", (p) => p.status === "on" && p.stock <= 10),
    wsOnline: wsOnline || 0,
  };
}

function trend(orders, days) {
  const daysN = Math.min(30, Math.max(1, Number(days) || 7));
  const map = {};
  for (let i = daysN - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    map[d] = { date: d, gmv: 0, orders: 0 };
  }
  orders.forEach((o) => {
    const d = (o.paidAt || o.createdAt || "").slice(0, 10);
    if (map[d]) { map[d].gmv += o.payableAmount; map[d].orders += 1; }
  });
  return Object.values(map);
}

function categoryDist(orders) {
  const map = {};
  const items = store.all("orderItems").filter((i) => orders.some((o) => o.id === i.orderId));
  items.forEach((it) => {
    const p = store.get("products", it.productId);
    if (!p) return;
    const cat = store.get("categories", p.categoryId);
    const name = cat ? cat.name : "其他";
    map[name] = (map[name] || 0) + it.subtotal;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function topProducts(orders, limit) {
  const map = {};
  store.all("orderItems").filter((i) => orders.some((o) => o.id === i.orderId)).forEach((it) => {
    const p = store.get("products", it.productId);
    if (!p) return;
    map[p.id] ||= { id: p.id, name: p.name, sales: 0, gmv: 0, image: p.mainImage };
    map[p.id].sales += it.quantity;
    map[p.id].gmv += it.subtotal;
  });
  return Object.values(map).sort((a, b) => b.gmv - a.gmv).slice(0, Number(limit) || 10);
}

function build(scope) {
  return {
    overview: buildOverview(scope, 0),
    trend: (days) => trend(scope, days),
    category: () => categoryDist(scope),
    top: (limit) => topProducts(scope, limit),
  };
}

router.get("/overview", auth("admin", "merchant"), asyncHandler(async (req, res) => {
  const online = (req.app.locals.ws && req.app.locals.ws.online && req.app.locals.ws.online()) || 0;
  const b = build(scopeOrders(req.user));
  res.json(ok({ ...b.overview, wsOnline: online }));
}));

router.get("/sales-trend", auth("admin", "merchant"), asyncHandler(async (req, res) => {
  res.json(ok(build(scopeOrders(req.user)).trend(req.query.days)));
}));

router.get("/category-distribution", auth("admin", "merchant"), asyncHandler(async (req, res) => {
  res.json(ok(build(scopeOrders(req.user)).category()));
}));


// B2B 商家对账报表（admin 全商家 / merchant 本店）
function settlement(orders, days) {
  const daysN = Math.min(90, Math.max(1, Number(days) || 30));
  const start = Date.now() - daysN * 86400000;
  const paid = orders.filter((o) => ["paid", "shipped", "completed", "refunding"].includes(o.status) && new Date(o.paidAt || o.createdAt).getTime() >= start);
  const byMerchant = {};
  paid.forEach((o) => {
    const m = (byMerchant[o.merchantId] ||= { merchantId: o.merchantId, orderCount: 0, gmv: 0 });
    m.orderCount += 1;
    m.gmv += o.payableAmount;
  });
  const merchants = Object.values(byMerchant).map((m) => {
    const merchant = store.get("merchants", m.merchantId);
    const commission = Math.round(m.gmv * config.commissionRate);
    return { ...m, merchantName: merchant ? merchant.name : "未知店铺", commissionRate: config.commissionRate, commission, net: m.gmv - commission };
  }).sort((a, b) => b.gmv - a.gmv);
  const totalGmv = merchants.reduce((s, m) => s + m.gmv, 0);
  const totalCommission = merchants.reduce((s, m) => s + m.commission, 0);
  return { days: daysN, startAt: new Date(start).toISOString(), merchants, totalGmv, totalCommission, totalNet: totalGmv - totalCommission, orderCount: paid.length };
}

router.get("/settlement", auth("admin", "merchant"), asyncHandler(async (req, res) => {
  const s = settlement(scopeOrders(req.user), req.query.days);
  if (req.user.role === "merchant") {
    s.merchants = s.merchants.filter((m) => m.merchantId === req.user.merchantId);
  }
  res.json(ok(s));
}));

// 库存预警（低库存商品列表）
router.get("/inventory-alerts", auth("admin", "merchant"), asyncHandler(async (req, res) => {
  const threshold = Number(req.query.threshold) || 10;
  let list = store.all("products").filter((p) => p.status === "on" && p.stock <= threshold);
  if (req.user.role === "merchant") list = list.filter((p) => p.merchantId === req.user.merchantId);
  list.sort((a, b) => a.stock - b.stock);
  const out = list.slice(0, 50).map((p) => {
    const merchant = store.get("merchants", p.merchantId);
    return { id: p.id, name: p.name, stock: p.stock, merchantId: p.merchantId, merchantName: merchant ? merchant.name : "", price: p.price };
  });
  res.json(ok({ threshold, total: list.length, list: out }));
}));

router.get("/top-products", auth("admin", "merchant"), asyncHandler(async (req, res) => {
  res.json(ok(build(scopeOrders(req.user)).top(req.query.limit)));
}));

export default router;