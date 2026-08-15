import { Router } from "express";
import store from "../store.js";
import { auth } from "../middleware.js";
import { asyncHandler, ok, fail, paginate, now } from "../util.js";
import { serializeProduct, serializeOrder, ORDER_STATUS, audit, toCsv } from "./common.js";

const router = Router();
router.use(auth("admin", "merchant"));

function assertMerchant(user, merchantId) {
  if (user.role === "merchant" && merchantId !== user.merchantId) return fail(403, 403, "无权操作其他商家资源");
}

// ---------- 商品管理 ----------
router.get("/products", asyncHandler(async (req, res) => {
  let list = store.all("products");
  if (req.user.role === "merchant") list = list.filter((p) => p.merchantId === req.user.merchantId);
  res.json(ok(paginate(list.map((p) => serializeProduct(p)), req.query.page, req.query.pageSize)));
}));

router.post("/products", asyncHandler(async (req, res) => {
  const { name, categoryId, price, stock, mainImage, description, subtitle, merchantId } = req.body || {};
  if (!name || !categoryId || !price) return fail(400, 400, "名称/分类/价格必填");
  const mid = req.user.role === "merchant" ? req.user.merchantId : (merchantId || 1);
  audit(req, "product.create", req.body.name, { merchantId: mid });
  const p = store.insert("products", {
    merchantId: mid,
    categoryId: Number(categoryId),
    name, subtitle: subtitle || "", description: description || "",
    mainImage: mainImage || "https://picsum.photos/seed/pnew/600/600",
    images: [mainImage || "https://picsum.photos/seed/pnew/600/600"],
    price: Math.round(Number(price) * 100),
    originalPrice: Math.round(Number(price) * 100),
    stock: Number(stock) || 0, sales: 0, tags: [], rating: 5, status: "on", isFlash: false, flashPrice: null,
  });
  res.json(ok(serializeProduct(p)));
}));

router.put("/products/:id", asyncHandler(async (req, res) => {
  const p = store.get("products", req.params.id);
  if (!p) return fail(404, 404, "商品不存在");
  assertMerchant(req.user, p.merchantId);
  const patch = {};
  ["name", "subtitle", "description", "mainImage", "categoryId", "status"].forEach((k) => {
    if (req.body[k] !== undefined) patch[k] = req.body[k];
  });
  if (req.body.price !== undefined) patch.price = Math.round(Number(req.body.price) * 100);
  if (req.body.originalPrice !== undefined) patch.originalPrice = Math.round(Number(req.body.originalPrice) * 100);
  if (req.body.stock !== undefined) patch.stock = Number(req.body.stock);
  if (req.body.tags !== undefined) patch.tags = req.body.tags;
  res.json(ok(serializeProduct(store.update("products", p.id, patch))));
}));

router.post("/products/:id/skus", asyncHandler(async (req, res) => {
  const p = store.get("products", req.params.id);
  if (!p) return fail(404, 404, "商品不存在");
  assertMerchant(req.user, p.merchantId);
  const { name, price, stock, specValues } = req.body || {};
  if (!name || !price) return fail(400, 400, "SKU 名称/价格必填");
  const sku = store.insert("productSkus", { productId: p.id, name, specValues: specValues || name.split(" "), price: Math.round(Number(price) * 100), stock: Number(stock) || 0, code: "SKU" + p.id + store.count("productSkus") });
  res.json(ok(sku));
}));

router.delete("/products/:id", asyncHandler(async (req, res) => {
  const p = store.get("products", req.params.id);
  if (!p) return fail(404, 404, "商品不存在");
  assertMerchant(req.user, p.merchantId);
  store.update("products", p.id, { status: "off" });
  audit(req, "product.off", "product:" + p.id);
  res.json(ok({ removed: true }));
}));

// ---------- B2B 批发管理 ----------
// 设置商品批发阶梯价（admin/merchant，merchant 仅本店）
router.post("/products/:id/tiers", asyncHandler(async (req, res) => {
  const p = store.get("products", req.params.id);
  if (!p) return fail(404, 404, "商品不存在");
  assertMerchant(req.user, p.merchantId);
  const tiers = Array.isArray(req.body.tiers) ? req.body.tiers : [];
  const clean = tiers
    .filter((t) => t && Number(t.minQuantity) > 0 && Number(t.price) > 0)
    .map((t) => ({ minQuantity: Math.round(Number(t.minQuantity)), price: Math.round(Number(t.price) * 100) }))
    .sort((a, b) => a.minQuantity - b.minQuantity);
  store.update("products", p.id, { wholesaleTiers: clean.length ? clean : null });
  audit(req, "product.tiers", "product:" + p.id, { tiers: clean });
  res.json(ok({ id: p.id, wholesaleTiers: clean }));
}));

// 设置用户客户类型（B2C retail / B2B wholesale）
router.put("/users/:id/customer-type", auth("admin"), asyncHandler(async (req, res) => {
  const u = store.get("users", req.params.id);
  if (!u) return fail(404, 404, "用户不存在");
  const type = req.body.customerType === "wholesale" ? "wholesale" : "retail";
  store.update("users", u.id, { customerType: type });
  audit(req, "user.customerType", "user:" + u.id, { customerType: type });
  res.json(ok({ id: u.id, customerType: type }));
}));

// ---------- 订单管理 ----------
router.get("/orders", asyncHandler(async (req, res) => {
  let list = store.all("orders");
  if (req.user.role === "merchant") list = list.filter((o) => o.merchantId === req.user.merchantId);
  if (req.query.status) list = list.filter((o) => o.status === req.query.status);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(ok(paginate(list.map((o) => serializeOrder(o)), req.query.page, req.query.pageSize)));
}));

// 发货
router.post("/orders/:id/ship", asyncHandler(async (req, res) => {
  const order = store.get("orders", req.params.id);
  if (!order) return fail(404, 404, "订单不存在");
  assertMerchant(req.user, order.merchantId);
  if (order.status !== "paid") return fail(400, 400, "仅待发货订单可发货");
  const { carrier, trackingNo } = req.body || {};
  if (!carrier || !trackingNo) return fail(400, 400, "请填写物流公司和单号");
  store.update("orders", order.id, { status: "shipped", shippedAt: now() });
  audit(req, "order.ship", "order:" + order.id, { carrier, trackingNo });
  const ev = { time: now(), text: `【揽收】商家已发货（${carrier} ${trackingNo}）` };
  const log = store.findOne("logistics", (l) => l.orderId === order.id);
  if (log) store.update("logistics", log.id, { carrier, trackingNo, status: "shipping", events: [...(log.events || []), ev] });
  else store.insert("logistics", { orderId: order.id, carrier, trackingNo, status: "shipping", events: [ev], shippedAt: now() });
  if (req.app.locals.ws) req.app.locals.ws.publishToUser(order.userId, { type: "notify", data: { title: "订单已发货", body: `订单 ${order.orderNo} 已通过 ${carrier} 发出` } });
  res.json(ok(serializeOrder(store.get("orders", order.id))));
}));

// ---------- 售后处理 ----------
router.get("/aftersales", asyncHandler(async (req, res) => {
  let list = store.all("aftersales");
  if (req.user.role === "merchant") {
    const orderIds = store.find("orders", (o) => o.merchantId === req.user.merchantId).map((o) => o.id);
    list = list.filter((a) => orderIds.includes(a.orderId));
  }
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(ok(paginate(list, req.query.page, req.query.pageSize)));
}));

router.post("/aftersales/:id/handle", asyncHandler(async (req, res) => {
  const a = store.get("aftersales", req.params.id);
  if (!a) return fail(404, 404, "售后单不存在");
  const order = store.get("orders", a.orderId);
  assertMerchant(req.user, order.merchantId);
  if (a.status !== "pending") return fail(400, 400, "售后单已处理");
  const approve = !!req.body.approve;
  const note = String(req.body.note || "").slice(0, 200);
  if (approve) {
    store.update("aftersales", a.id, { status: "refunded", merchantNote: note });
    store.update("orders", order.id, { status: "refunded" });
    store.find("payments", (p) => p.orderId === order.id && p.status === "success").forEach((p) => {
      store.update("payments", p.id, { status: "refunded" });
    });
    // 扣回已返积分
    const points = Math.floor(order.payableAmount / 100);
    const u = store.get("users", order.userId);
    if (u) store.update("users", u.id, { points: Math.max(0, (u.points || 0) - points) });
    if (req.app.locals.ws) req.app.locals.ws.publishToUser(order.userId, { type: "notify", data: { title: "退款成功", body: `订单 ${order.orderNo} 已退款，金额将原路退回` } });
  } else {
    store.update("aftersales", a.id, { status: "rejected", merchantNote: note });
    store.update("orders", order.id, { status: order.paidAt ? "paid" : "pending_payment" });
    if (req.app.locals.ws) req.app.locals.ws.publishToUser(order.userId, { type: "notify", data: { title: "售后未通过", body: `订单 ${order.orderNo} 的售后申请被拒绝${note ? "：" + note : ""}` } });
  }
  res.json(ok(store.get("aftersales", a.id)));
}));


// B2B 客户管理：批发客户及其在本店的采购情况（admin 全量 / merchant 本店）
router.get("/b2b-customers", asyncHandler(async (req, res) => {
  const wholesaleUsers = store.find("users", (u) => u.customerType === "wholesale");
  const orders = store.all("orders");
  const rows = wholesaleUsers.map((u) => {
    const mine = req.user.role === "merchant" ? orders.filter((o) => o.userId === u.id && o.merchantId === req.user.merchantId) : orders.filter((o) => o.userId === u.id);
    const paid = mine.filter((o) => ["paid", "shipped", "completed", "refunding"].includes(o.status));
    return {
      userId: u.id, nickname: u.nickname, phone: u.phone,
      orderCount: paid.length,
      gmv: paid.reduce((s, o) => s + o.payableAmount, 0),
      lastOrderAt: mine.length ? mine[mine.length - 1].createdAt : null,
    };
  }).filter((r) => r.orderCount > 0).sort((a, b) => b.gmv - a.gmv);
  res.json(ok({ total: rows.length, list: rows }));
}));

// 审计日志（仅 admin）
router.get("/audit-logs", auth("admin"), asyncHandler(async (req, res) => {
  const list = store.all("auditLogs").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(ok(paginate(list, req.query.page, req.query.pageSize)));
}));

// 订单导出 CSV
router.get("/orders/export", asyncHandler(async (req, res) => {
  let list = store.all("orders");
  if (req.user.role === "merchant") list = list.filter((o) => o.merchantId === req.user.merchantId);
  if (req.query.status) list = list.filter((o) => o.status === req.query.status);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const csv = toCsv(
    ["订单号", "状态", "用户ID", "商家ID", "总金额(分)", "应付(分)", "支付方式", "创建时间", "支付时间"],
    list.map((o) => [o.orderNo, ORDER_STATUS[o.status] || o.status, o.userId, o.merchantId, o.totalAmount, o.payableAmount, o.paymentMethod || "", o.createdAt, o.paidAt || ""])
  );
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
  res.send(csv);
}));

// ---------- 用户管理 ----------
router.get("/users", auth("admin"), asyncHandler(async (req, res) => {
  const list = store.all("users").map((u) => ({ id: u.id, phone: u.phone, nickname: u.nickname, role: u.role, points: u.points, status: u.status, createdAt: u.createdAt }));
  res.json(ok(paginate(list, req.query.page, req.query.pageSize)));
}));

router.put("/users/:id/status", auth("admin"), asyncHandler(async (req, res) => {
  const u = store.get("users", req.params.id);
  if (!u) return fail(404, 404, "用户不存在");
  const status = req.body.status === "active" ? "active" : "banned";
  store.update("users", u.id, { status });
  audit(req, "user.status", "user:" + u.id, { status });
  res.json(ok({ id: u.id, status }));
}));

export default router;