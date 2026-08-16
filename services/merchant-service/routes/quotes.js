import { Router } from "express";
import store from "../../_shared/store.js";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok, fail, paginate, uid, now } from "../../_shared/util.js";
import { callInternal } from "../../_shared/internal-client.js";
import { publishToUser } from "../../_shared/publisher.js";
import { auditLog } from "../../_shared/audit.js";

const router = Router();

async function ser(q) {
  let productName = q.productName || "", productImage = "", buyerName = "", merchantName = "";
  try {
    const prod = await callInternal("catalog", "GET", "/internal/products/" + q.productId);
    if (prod && prod.product) { productName = prod.product.name; productImage = prod.product.mainImage; }
  } catch {}
  try {
    const buyer = await callInternal("auth", "GET", "/internal/users/" + q.buyerId);
    if (buyer) buyerName = buyer.nickname || "";
  } catch {}
  try {
    const m = await callInternal("merchant", "GET", "/internal/merchants/" + q.merchantId);
    if (m) merchantName = m.name || "";
  } catch {}
  return {
    id: q.id, rfqNo: q.rfqNo, productId: q.productId, productName,
    productImage,
    quantity: q.quantity, targetPrice: q.targetPrice, note: q.note,
    status: q.status, statusText: { pending: "待报价", quoted: "已报价", accepted: "已接受", rejected: "已拒绝" }[q.status] || q.status,
    quotePrice: q.quotePrice, quoteNote: q.quoteNote,
    buyerName, merchantName,
    createdAt: q.createdAt, quotedAt: q.quotedAt, orderId: q.orderId || null,
  };
}

// 买家发起询价
router.post("/quotes", auth("user"), asyncHandler(async (req, res) => {
  const { productId, quantity = 1, targetPrice, note } = req.body || {};
  const prod = await callInternal("catalog", "GET", "/internal/products/" + productId).catch(() => null);
  if (!prod || !prod.product || prod.product.status !== "on") return fail(404, 404, "商品不存在");
  const qty = Math.max(1, Math.min(99999, Number(quantity) || 1));
  const quote = store.insert("quotes", {
    rfqNo: "RFQ" + uid(10).toUpperCase(),
    buyerId: req.user.id,
    productId: Number(productId),
    productName: prod.product.name,
    merchantId: prod.product.merchantId,
    quantity: qty,
    targetPrice: targetPrice ? Math.round(Number(targetPrice)) : null,
    note: String(note || "").slice(0, 300),
    status: "pending",
    quotePrice: null, quoteNote: null,
    createdAt: now(), quotedAt: null,
  });
  res.json(ok(await ser(quote)));
}));

router.get("/my/quotes", auth(), asyncHandler(async (req, res) => {
  const list = store.find("quotes", (q) => q.buyerId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const out = [];
  for (const q of list) out.push(await ser(q));
  res.json(ok(paginate(out, req.query.page, req.query.pageSize)));
}));

router.get("/quotes/:id", auth(), asyncHandler(async (req, res) => {
  const q = store.get("quotes", req.params.id);
  if (!q) return fail(404, 404, "询价单不存在");
  const isBuyer = q.buyerId === req.user.id;
  const isMerchant = req.user.role === "merchant" && q.merchantId === req.user.merchantId;
  if (!isBuyer && !isMerchant && req.user.role !== "admin") return fail(403, 403, "无权查看");
  res.json(ok(await ser(q)));
}));

// 买家接受报价 -> trade 生成订单
router.post("/quotes/:id/accept", auth("user"), asyncHandler(async (req, res) => {
  const q = store.get("quotes", req.params.id);
  if (!q || q.buyerId !== req.user.id) return fail(404, 404, "询价单不存在");
  if (q.status !== "quoted") return fail(400, 400, "当前状态不可接受");
  const prod = await callInternal("catalog", "GET", "/internal/products/" + q.productId).catch(() => null);
  if (!prod || !prod.product) return fail(404, 404, "商品或 SKU 不存在");
  const sku = (prod.skus || [])[0];
  if (!sku || sku.stock < q.quantity) return fail(400, 400, "库存不足，无法按报价成交");
  const address = await callInternal("auth", "GET", "/internal/addresses/" + req.user.id + "/default").catch(() => null);
  if (!address) return fail(400, 400, "请先添加收货地址");
  const unitPrice = q.quotePrice;
  const total = unitPrice * q.quantity;
  // trade 内部接口：扣库存 + 生成按报价金额的订单
  const order = await callInternal("trade", "POST", "/internal/orders/direct", {
    userId: req.user.id,
    merchantId: q.merchantId,
    totalAmount: total, discountAmount: 0, couponId: null, couponAmount: 0,
    payableAmount: total,
    currency: "CNY",
    remark: "询价成交订单（" + q.rfqNo + "）",
    quoteId: q.id,
    address: { name: address.name, phone: address.phone, province: address.province || "", city: address.city || "", district: address.district || "", detail: address.detail },
    items: [{ productId: q.productId, skuId: sku.id, productName: prod.product.name, skuName: sku.name, image: prod.product.mainImage, price: unitPrice, quantity: q.quantity }],
  });
  store.update("quotes", q.id, { status: "accepted", acceptedAt: now(), orderId: order.id });
  res.json(ok({ ...(await ser(store.get("quotes", q.id))), order }));
}));

// 商家/管理员：询价列表
router.get("/admin/quotes", auth("admin", "merchant"), asyncHandler(async (req, res) => {
  let list = store.all("quotes");
  if (req.user.role === "merchant") list = list.filter((q) => q.merchantId === req.user.merchantId);
  if (req.query.status) list = list.filter((q) => q.status === req.query.status);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const out = [];
  for (const q of list) out.push(await ser(q));
  res.json(ok(paginate(out, req.query.page, req.query.pageSize)));
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
  auditLog(req.user, "quote.respond", q.rfqNo, { price }, req.ip);
  await publishToUser(q.buyerId, { type: "notify", data: { title: "询价已回复", body: "您的询价单 " + q.rfqNo + " 已收到报价" } });
  res.json(ok(await ser(store.get("quotes", q.id))));
}));

export default router;
