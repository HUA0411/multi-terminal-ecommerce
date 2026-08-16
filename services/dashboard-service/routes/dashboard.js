import { Router } from "express";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok } from "../../_shared/util.js";
import config from "../../_shared/config.js";
import { callInternal } from "../../_shared/internal-client.js";

const router = Router();
router.use(auth("admin", "merchant"));

async function scopeOrders(user) {
  const params = {};
  if (user.role === "merchant") params.merchantId = user.merchantId;
  const r = await callInternal("trade", "GET", "/internal/orders/query", null, params).catch(() => ({ list: [] }));
  return (r && r.list) || [];
}

async function allProducts() {
  const r = await callInternal("catalog", "GET", "/internal/products/query", null, { status: "on" }).catch(() => ({ list: [] }));
  return (r && r.list) || [];
}

async function buildOverview(orders, wsOnline) {
  const paid = orders.filter((o) => ["paid", "shipped", "completed", "refunding"].includes(o.status));
  const gmv = paid.reduce((s, o) => s + o.payableAmount, 0);
  const todayKey = new Date().toISOString().slice(0, 10);
  const today = orders.filter((o) => (o.createdAt || "").slice(0, 10) === todayKey);
  const todayPaid = paid.filter((o) => (o.paidAt || "").slice(0, 10) === todayKey);
  // 用户/商品/低库存（跨服务）
  let userCount = 0, productCount = 0, lowStockCount = 0;
  try {
    const users = await callInternal("auth", "GET", "/internal/users/query", null, { role: "user" });
    userCount = ((users && users.list) || []).length;
  } catch {}
  const onSale = await allProducts();
  productCount = onSale.length;
  lowStockCount = onSale.filter((p) => p.stock <= 10).length;
  return {
    gmv,
    orderCount: orders.length,
    userCount,
    productCount,
    conversionRate: orders.length ? Math.round((paid.length / orders.length) * 1000) / 10 : 0,
    avgOrderValue: paid.length ? Math.round(gmv / paid.length) : 0,
    todayGmv: todayPaid.reduce((s, o) => s + o.payableAmount, 0),
    todayOrders: today.length,
    refundRate: paid.length ? Math.round((orders.filter((o) => o.status === "refunded" || o.status === "refunding").length / paid.length) * 1000) / 10 : 0,
    lowStockCount,
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

async function orderItems(orders) {
  const ids = orders.map((o) => o.id);
  if (!ids.length) return [];
  const r = await callInternal("trade", "GET", "/internal/order-items", null, { orderIds: ids.join(",") }).catch(() => ({ list: [] }));
  return (r && r.list) || [];
}

async function categoryDist(orders) {
  const items = await orderItems(orders);
  let cats = [];
  try {
    const r = await callInternal("catalog", "GET", "/internal/categories");
    cats = (r && r.tree) || [];
  } catch {}
  const flat = [];
  const walk = (list) => list.forEach((c) => { flat.push(c); walk(c.children || []); });
  walk(cats);
  const map = {};
  items.forEach((it) => {
    const cat = flat.find((c) => c.id === it.productId ? false : false) || null;
    // 商品分类需 catalog 查询；此处按 orderItems 无分类，改用商品接口批量解析
    void cat;
  });
  return [];
}

router.get("/overview", asyncHandler(async (req, res) => {
  const orders = await scopeOrders(req.user);
  let online = 0;
  try {
    const r = await callInternal("gateway", "GET", "/internal/ws/online");
    online = (r && r.online) || 0;
  } catch {}
  res.json(ok({ ...(await buildOverview(orders, online)) }));
}));

router.get("/sales-trend", asyncHandler(async (req, res) => {
  const orders = await scopeOrders(req.user);
  res.json(ok(trend(orders, req.query.days)));
}));

router.get("/category-distribution", asyncHandler(async (req, res) => {
  const orders = await scopeOrders(req.user);
  const items = await orderItems(orders);
  // 商品分类（catalog 批量）
  const prodIds = [...new Set(items.map((i) => i.productId).filter(Boolean))];
  let batch = [];
  if (prodIds.length) {
    const r = await callInternal("catalog", "GET", "/internal/products/batch", null, { ids: prodIds.join(",") }).catch(() => ({ list: [] }));
    batch = (r && r.list) || [];
  }
  const catOf = {};
  batch.forEach((full) => { if (full && full.product) catOf[full.product.id] = full.product.categoryId; });
  let cats = [];
  try {
    const r = await callInternal("catalog", "GET", "/internal/categories");
    cats = (r && r.tree) || [];
  } catch {}
  const flat = [];
  const walk = (list) => list.forEach((c) => { flat.push(c); walk(c.children || []); });
  walk(cats);
  const nameOf = (cid) => { const c = flat.find((x) => Number(x.id) === Number(cid)); return c ? c.name : "其他"; };
  const map = {};
  items.forEach((it) => {
    const cid = catOf[it.productId];
    const name = nameOf(cid);
    map[name] = (map[name] || 0) + it.subtotal;
  });
  res.json(ok(Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)));
}));

async function topProducts(orders, limit) {
  const items = await orderItems(orders);
  const prodIds = [...new Set(items.map((i) => i.productId).filter(Boolean))];
  let batch = [];
  if (prodIds.length) {
    const r = await callInternal("catalog", "GET", "/internal/products/batch", null, { ids: prodIds.join(",") }).catch(() => ({ list: [] }));
    batch = (r && r.list) || [];
  }
  const prodMap = {};
  batch.forEach((full) => { if (full && full.product) prodMap[full.product.id] = full.product; });
  const map = {};
  items.forEach((it) => {
    const p = prodMap[it.productId];
    if (!p) return;
    map[p.id] ||= { id: p.id, name: p.name, sales: 0, gmv: 0, image: p.mainImage };
    map[p.id].sales += it.quantity;
    map[p.id].gmv += it.subtotal;
  });
  return Object.values(map).sort((a, b) => b.gmv - a.gmv).slice(0, Number(limit) || 10);
}

router.get("/top-products", asyncHandler(async (req, res) => {
  const orders = await scopeOrders(req.user);
  res.json(ok(await topProducts(orders, req.query.limit)));
}));

// B2B 商家对账报表
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
    const commission = Math.round(m.gmv * config.commissionRate);
    return { ...m, merchantName: "", commissionRate: config.commissionRate, commission, net: m.gmv - commission };
  }).sort((a, b) => b.gmv - a.gmv);
  const totalGmv = merchants.reduce((s, m) => s + m.gmv, 0);
  const totalCommission = merchants.reduce((s, m) => s + m.commission, 0);
  return { days: daysN, startAt: new Date(start).toISOString(), merchants, totalGmv, totalCommission, totalNet: totalGmv - totalCommission, orderCount: paid.length };
}

async function fillMerchantNames(s) {
  const ids = [...new Set(s.merchants.map((m) => m.merchantId))];
  const r = await callInternal("merchant", "GET", "/internal/merchants").catch(() => ({ list: [] }));
  const nameOf = {};
  ((r && r.list) || []).forEach((m) => { nameOf[m.id] = m.name; });
  s.merchants.forEach((m) => { m.merchantName = nameOf[m.merchantId] || "未知店铺"; });
  void ids;
  return s;
}

router.get("/settlement", asyncHandler(async (req, res) => {
  const orders = await scopeOrders(req.user);
  const s = settlement(orders, req.query.days);
  if (req.user.role === "merchant") {
    s.merchants = s.merchants.filter((m) => m.merchantId === req.user.merchantId);
  }
  res.json(ok(await fillMerchantNames(s)));
}));

// 对账报表导出 CSV
router.get("/settlement/export", asyncHandler(async (req, res) => {
  const orders = await scopeOrders(req.user);
  const s = settlement(orders, req.query.days);
  let rows = s.merchants;
  if (req.user.role === "merchant") rows = rows.filter((m) => m.merchantId === req.user.merchantId);
  await fillMerchantNames({ merchants: rows });
  const esc = (v) => {
    const sv = String(v === null || v === undefined ? "" : v);
    return /[",\n]/.test(sv) ? '"' + sv.replace(/"/g, '""') + '"' : sv;
  };
  const headers = ["商家ID", "商家", "订单数", "GMV(分)", "佣金率", "佣金(分)", "净结算(分)"];
  const csv = "\uFEFF" + [headers.map(esc).join(","), ...rows.map((m) => [m.merchantId, m.merchantName, m.orderCount, m.gmv, m.commissionRate, m.commission, m.net].map(esc).join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=settlement.csv");
  res.send(csv);
}));

// 库存预警
router.get("/inventory-alerts", asyncHandler(async (req, res) => {
  const threshold = Number(req.query.threshold) || 10;
  let list = await allProducts();
  list = list.filter((p) => p.stock <= threshold);
  if (req.user.role === "merchant") list = list.filter((p) => p.merchantId === req.user.merchantId);
  list.sort((a, b) => a.stock - b.stock);
  const out = list.slice(0, 50).map((p) => ({ id: p.id, name: p.name, stock: p.stock, merchantId: p.merchantId, merchantName: p.merchantName || "", price: p.price }));
  res.json(ok({ threshold, total: list.length, list: out }));
}));

export default router;
