import { Router } from "express";
import store from "../store.js";
import { auth, optionalAuth, rateLimit } from "../middleware.js";
import { asyncHandler, ok, fail, paginate, orderNo, now, uid } from "../util.js";
import { serializeProduct, serializeOrder, convert } from "./common.js";

const router = Router();

// ---------- 优惠券 ----------
router.get("/coupons/available", optionalAuth, asyncHandler(async (req, res) => {
  const nowT = Date.now();
  const list = store.all("coupons").filter((c) => {
    return c.status === "active" && new Date(c.startAt) <= nowT && new Date(c.endAt) >= nowT && c.claimed < c.total;
  });
  const my = req.user ? store.find("userCoupons", (c) => c.userId === req.user.id).map((c) => c.couponId) : [];
  res.json(ok(paginate(list.map((c) => ({ id: c.id, name: c.name, type: c.type, threshold: c.threshold, value: c.value, merchantId: c.merchantId, startAt: c.startAt, endAt: c.endAt, claimed: c.claimed, total: c.total, claimedByMe: my.includes(c.id) })), req.query.page, req.query.pageSize)));
}));

router.post("/coupons/:id/claim", auth(), rateLimit({ max: 5, windowMs: 300000, name: "coupon_abuse" }), asyncHandler(async (req, res) => {
  const coupon = store.get("coupons", req.params.id);
  if (!coupon || coupon.status !== "active") return fail(404, 404, "优惠券不存在");
  const nowT = Date.now();
  if (new Date(coupon.startAt) > nowT || new Date(coupon.endAt) < nowT) return fail(400, 400, "不在领取时间内");
  if (coupon.claimed >= coupon.total) return fail(400, 400, "优惠券已被领完");
  const mine = store.find("userCoupons", (c) => c.userId === req.user.id && c.couponId === coupon.id);
  if (mine.length >= coupon.perUser) return fail(400, 400, "已达领取上限");
  store.insert("userCoupons", { userId: req.user.id, couponId: coupon.id, status: "unused", claimedAt: now(), usedAt: null, orderId: null });
  store.update("coupons", coupon.id, { claimed: coupon.claimed + 1 });
  res.json(ok({ claimed: true }));
}));

router.get("/my/coupons", auth(), asyncHandler(async (req, res) => {
  const { status } = req.query;
  let list = store.find("userCoupons", (c) => c.userId === req.user.id);
  if (status) list = list.filter((c) => c.status === status);
  const nowT = Date.now();
  // 过期券状态纠正
  list = list.map((uc) => {
    const coupon = store.get("coupons", uc.couponId);
    const expired = uc.status === "unused" && coupon && new Date(coupon.endAt) < nowT;
    if (expired) store.update("userCoupons", uc.id, { status: "expired" });
    return { ...uc, expired: !!expired, name: coupon ? coupon.name : "", type: coupon ? coupon.type : "", threshold: coupon ? coupon.threshold : 0, value: coupon ? coupon.value : 0, endAt: coupon ? coupon.endAt : "" };
  });
  res.json(ok(paginate(list, req.query.page, req.query.pageSize)));
}));

// 管理端：创建优惠券（admin/merchant；merchant 仅本店券）
router.post("/coupons", auth("admin", "merchant"), asyncHandler(async (req, res) => {
  const { name, amount, value, threshold = 0, total = 100, perUser = 1, startAt, endAt, expireAt, type, merchantId } = req.body || {};
  if (!name) return fail(400, 400, "优惠券名称必填");
  const val = Number(amount !== undefined ? amount : value);
  if (!val || val <= 0) return fail(400, 400, "优惠面额必须大于 0");
  const end = endAt || expireAt;
  if (!end) return fail(400, 400, "请设置有效期");
  const mid = req.user.role === "merchant" ? req.user.merchantId : (merchantId || null);
  const coupon = store.insert("coupons", {
    merchantId: mid,
    name,
    type: type === "discount" ? "discount" : "full_reduction",
    threshold: Math.round(Number(threshold) || 0),
    value: Math.round(Number(val)),
    total: Math.round(Number(total) || 100),
    claimed: 0,
    perUser: Math.round(Number(perUser) || 1),
    startAt: startAt || now(),
    endAt: end,
    status: "active",
  });
  res.json(ok(coupon));
}));

// ---------- 秒杀 ----------
router.get("/flashsales", asyncHandler(async (req, res) => {
  const nowT = Date.now();
  const list = store.all("flashSales").filter((f) => {
    const fs = new Date(f.startAt) <= nowT;
    const fe = new Date(f.endAt) >= nowT;
    return req.query.all === "1" ? f.status !== "inactive" : fs && fe && f.status === "active";
  }).map((f) => {
    const p = store.get("products", f.productId);
    return {
      id: f.id, productId: f.productId, productName: p ? p.name : "", image: p ? p.mainImage : "",
      flashPrice: f.flashPrice, originalPrice: p ? p.price : 0, quota: f.quota, sold: f.sold,
      startAt: f.startAt, endAt: f.endAt, status: f.status,
      remaining: Math.max(0, f.quota - f.sold),
    };
  });
  res.json(ok(list));
}));

router.post("/flashsales/:id/seckill", auth(), rateLimit({ max: 3, name: "seckill" }), asyncHandler(async (req, res) => {
  const fs = store.get("flashSales", req.params.id);
  if (!fs) return fail(404, 404, "秒杀活动不存在");
  const nowT = Date.now();
  if (new Date(fs.startAt) > nowT) return fail(400, 400, "秒杀尚未开始");
  if (new Date(fs.endAt) < nowT) return fail(400, 400, "秒杀已结束");
  if (fs.sold >= fs.quota) return fail(400, 400, "手慢了，秒杀商品已抢光");
  const sku = store.get("productSkus", req.body.skuId || fs.skuId);
  if (!sku || sku.productId !== fs.productId) return fail(400, 400, "SKU 无效");
  if (sku.stock <= 0) return fail(400, 400, "库存不足");
  // 限购：每人每活动限 1 单
  const bought = store.find("orders", (o) => o.userId === req.user.id && o.flashSaleId === fs.id);
  if (bought.length) return fail(400, 400, "每个账号限购 1 件");
  const product = store.get("products", fs.productId);
  const address = store.findOne("addresses", (a) => a.userId === req.user.id);
  if (!address) return fail(400, 400, "请先添加收货地址");

  // 扣减秒杀名额与库存
  store.update("flashSales", fs.id, { sold: fs.sold + 1 });
  store.update("productSkus", sku.id, { stock: sku.stock - 1 });
  store.update("products", product.id, { stock: Math.max(0, product.stock - 1) });
  const order = store.insert("orders", {
    orderNo: orderNo(),
    userId: req.user.id,
    merchantId: product.merchantId,
    status: "pending_payment",
    totalAmount: fs.flashPrice,
    discountAmount: product.price - fs.flashPrice,
    couponId: null, couponAmount: 0,
    payableAmount: fs.flashPrice,
    currency: "CNY", paymentMethod: null,
    flashSaleId: fs.id,
    address: { name: address.name, phone: address.phone, detail: `${address.province} ${address.city} ${address.district} ${address.detail}` },
    remark: "秒杀订单",
    paidAt: null, shippedAt: null, completedAt: null,
  });
  store.insert("orderItems", { orderId: order.id, productId: product.id, skuId: sku.id, productName: product.name, skuName: sku.name, image: product.mainImage, price: fs.flashPrice, quantity: 1, subtotal: fs.flashPrice });
  if (req.app.locals.ws) req.app.locals.ws.publishToUser(req.user.id, { type: "notify", data: { title: "秒杀成功", body: `恭喜抢到「${product.name}」，请尽快支付` } });
  res.json(ok({ ok: true, order: serializeOrder(order) }));
}));

// 管理端：创建秒杀活动（admin/merchant；merchant 仅本店商品）
router.post("/flashsales", auth("admin", "merchant"), asyncHandler(async (req, res) => {
  const { productId, skuId, flashPrice, quota = 100, startAt, endAt } = req.body || {};
  if (!productId || flashPrice == null) return fail(400, 400, "商品ID与秒杀价必填");
  const product = store.get("products", productId);
  if (!product) return fail(404, 404, "商品不存在");
  if (req.user.role === "merchant" && product.merchantId !== req.user.merchantId) return fail(403, 403, "无权为该商品创建秒杀");
  const skus = store.find("productSkus", (s) => s.productId === product.id);
  const sid = Number(skuId) || (skus[0] && skus[0].id);
  if (!sid) return fail(400, 400, "商品无 SKU，无法创建秒杀");
  const flashSale = store.insert("flashSales", {
    productId: product.id,
    skuId: sid,
    flashPrice: Math.round(Number(flashPrice)),
    quota: Math.round(Number(quota) || 100),
    sold: 0,
    startAt: startAt || now(),
    endAt: endAt || new Date(Date.now() + 7 * 86400000).toISOString(),
    status: "active",
  });
  res.json(ok(flashSale));
}));

// ---------- 分享 ----------
router.post("/shares", auth(), asyncHandler(async (req, res) => {
  const { type = "product", refId } = req.body || {};
  if (type !== "invite" && !refId) return fail(400, 400, "缺少分享对象");
  const code = "SH" + uid(8).toUpperCase();
  const share = store.insert("shares", { code, userId: req.user.id, type, refId: Number(refId), clicks: 0, createdAt: now() });
  res.json(ok({ id: share.id, code, url: `/s/${code}` }));
}));

router.get("/shares/:code", asyncHandler(async (req, res) => {
  const share = store.findOne("shares", (s) => s.code === req.params.code);
  if (!share) return fail(404, 404, "分享链接无效");
  store.update("shares", share.id, { clicks: share.clicks + 1 });
  const user = store.get("users", share.userId);
  const product = share.type === "product" ? store.get("products", share.refId) : null;
  res.json(ok({ code: share.code, type: share.type, refId: share.refId, user: user ? { nickname: user.nickname, avatar: user.avatar } : null, clicks: share.clicks + 1, product: product ? serializeProduct(product) : null }));
}));

// ---------- 积分 ----------
router.get("/my/points", auth(), asyncHandler(async (req, res) => {
  res.json(ok({ balance: req.user.points || 0 }));
}));

router.get("/my/points/logs", auth(), asyncHandler(async (req, res) => {
  const list = store.find("pointsLogs", (l) => l.userId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(ok(paginate(list, req.query.page, req.query.pageSize)));
}));

export default router;