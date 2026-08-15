import { Router } from "express";
import store from "../store.js";
import { auth } from "../middleware.js";
import { asyncHandler, ok, fail, paginate, uid, now } from "../util.js";
import { audit, serializeOrder } from "./common.js";
import { orderNo } from "../util.js";

const router = Router();

function ser(q) {
  const product = store.get("products", q.productId);
  const buyer = store.get("users", q.buyerId);
  const merchant = store.get("merchants", q.merchantId);
  return {
    id: q.id, rfqNo: q.rfqNo, productId: q.productId, productName: product ? product.name : q.productName,
    productImage: product ? product.mainImage : "",
    quantity: q.quantity, targetPrice: q.targetPrice, note: q.note,
    status: q.status, statusText: { pending: "待报价", quoted: "已报价", accepted: "已接受", rejected: "已拒绝" }[q.status] || q.status,
    quotePrice: q.quotePrice, quoteNote: q.quoteNote,
    buyerName: buyer ? buyer.nickname : "", merchantName: merchant ? merchant.name : "",
    createdAt: q.createdAt, quotedAt: q.quotedAt, orderId: q.orderId || null,
  };
}

// 买家发起询价（RFQ）
router.post("/quotes", auth("user"), asyncHandler(async (req, res) => {
  const { productId, quantity = 1, targetPrice, note } = req.body || {};
  const product = store.get("products", productId);
  if (!product || product.status !== "on") return fail(404, 404, "商品不存在");
  const qty = Math.max(1, Math.min(99999, Number(quantity) || 1));
  const quote = store.insert("quotes", {
    rfqNo: "RFQ" + uid(10).toUpperCase(),
    buyerId: req.user.id,
    productId: product.id,
    productName: product.name,
    merchantId: product.merchantId,
    quantity: qty,
    targetPrice: targetPrice ? Math.round(Number(targetPrice)) : null,
    note: String(note || "").slice(0, 300),
    status: "pending",
    quotePrice: null, quoteNote: null,
    createdAt: now(), quotedAt: null,
  });
  res.json(ok(ser(quote)));
}));

// 我的询价单
router.get("/my/quotes", auth(), asyncHandler(async (req, res) => {
  const list = store.find("quotes", (q) => q.buyerId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(ok(paginate(list.map(ser), req.query.page, req.query.pageSize)));
}));

// 询价详情（买家或所属商家）
router.get("/quotes/:id", auth(), asyncHandler(async (req, res) => {
  const q = store.get("quotes", req.params.id);
  if (!q) return fail(404, 404, "询价单不存在");
  const isBuyer = q.buyerId === req.user.id;
  const isMerchant = req.user.role === "merchant" && q.merchantId === req.user.merchantId;
  if (!isBuyer && !isMerchant && req.user.role !== "admin") return fail(403, 403, "无权查看");
  res.json(ok(ser(q)));
}));

// 买家接受报价 -> 自动生成按报价金额的待支付订单（B2B 询价交易闭环）
router.post("/quotes/:id/accept", auth("user"), asyncHandler(async (req, res) => {
  const q = store.get("quotes", req.params.id);
  if (!q || q.buyerId !== req.user.id) return fail(404, 404, "询价单不存在");
  if (q.status !== "quoted") return fail(400, 400, "当前状态不可接受");
  const product = store.get("products", q.productId);
  const sku = store.find("productSkus", (s) => s.productId === q.productId)[0] || null;
  if (!product || !sku) return fail(404, 404, "商品或 SKU 不存在");
  if (sku.stock < q.quantity) return fail(400, 400, "库存不足，无法按报价成交");
  const unitPrice = q.quotePrice;
  const total = unitPrice * q.quantity;
  const address = store.findOne("addresses", (a) => a.userId === req.user.id);
  if (!address) return fail(400, 400, "请先添加收货地址");
  // 扣库存 + 生成订单
  store.update("productSkus", sku.id, { stock: sku.stock - q.quantity });
  store.update("products", product.id, { stock: Math.max(0, product.stock - q.quantity) });
  const order = store.insert("orders", {
    orderNo: orderNo(),
    userId: req.user.id,
    merchantId: product.merchantId,
    status: "pending_payment",
    totalAmount: total,
    discountAmount: 0,
    couponId: null,
    couponAmount: 0,
    payableAmount: total,
    currency: "CNY",
    paymentMethod: null,
    quoteId: q.id,
    address: { name: address.name, phone: address.phone, province: address.province || "", city: address.city || "", district: address.district || "", detail: address.detail },
    remark: "询价成交订单（" + q.rfqNo + "）",
    paidAt: null, shippedAt: null, completedAt: null,
  });
  store.insert("orderItems", { orderId: order.id, productId: product.id, skuId: sku.id, productName: product.name, skuName: sku.name, image: product.mainImage, price: unitPrice, quantity: q.quantity, subtotal: total });
  store.update("quotes", q.id, { status: "accepted", acceptedAt: now(), orderId: order.id });
  res.json(ok({ ...ser(store.get("quotes", q.id)), order: serializeOrder(order) }));
}));

// 商家/管理员：询价列表（商家仅本店商品）
router.get("/admin/quotes", auth("admin", "merchant"), asyncHandler(async (req, res) => {
  let list = store.all("quotes");
  if (req.user.role === "merchant") list = list.filter((q) => q.merchantId === req.user.merchantId);
  if (req.query.status) list = list.filter((q) => q.status === req.query.status);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(ok(paginate(list.map(ser), req.query.page, req.query.pageSize)));
}));

// 商家/管理员：报价
router.post("/admin/quotes/:id/quote", auth("admin", "merchant"), asyncHandler(async (req, res) => {
  const q = store.get("quotes", req.params.id);
  if (!q) return fail(404, 404, "询价单不存在");
  if (req.user.role === "merchant" && q.merchantId !== req.user.merchantId) return fail(403, 403, "无权操作其他商家询价单");
  if (q.status !== "pending") return fail(400, 400, "询价单已处理");
  const price = Math.round(Number(req.body.price));
  if (!price || price <= 0) return fail(400, 400, "报价必须大于 0");
  store.update("quotes", q.id, { status: "quoted", quotePrice: price, quoteNote: String(req.body.note || "").slice(0, 300), quotedAt: now() });
  audit(req, "quote.respond", q.rfqNo, { price });
  const buyer = store.get("users", q.buyerId);
  if (buyer && req.app.locals.ws) req.app.locals.ws.publishToUser(buyer.id, { type: "notify", data: { title: "询价已回复", body: "您的询价单 " + q.rfqNo + " 已收到报价" } });
  res.json(ok(ser(store.get("quotes", q.id))));
}));

export default router;