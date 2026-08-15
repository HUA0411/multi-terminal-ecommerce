import { Router } from "express";
import store from "../store.js";
import { auth } from "../middleware.js";
import { asyncHandler, ok, fail, paginate, uid, now, orderNo } from "../util.js";
import { serializeOrder } from "./common.js";

const router = Router();

function ser(g) {
  const product = store.get("products", g.productId);
  const leader = store.get("users", g.leaderId);
  const merchant = store.get("merchants", g.merchantId);
  return {
    id: g.id, grouponNo: g.grouponNo, productId: g.productId, productName: product ? product.name : "",
    productImage: product ? product.mainImage : "", groupPrice: g.groupPrice, originalPrice: product ? product.price : 0,
    targetSize: g.targetSize, currentSize: g.currentSize,
    status: g.status, statusText: { open: "拼团中", success: "已成团", failed: "未成团" }[g.status] || g.status,
    leaderName: leader ? leader.nickname : "", merchantName: merchant ? merchant.name : "",
    deadline: g.deadline, createdAt: g.createdAt,
  };
}

// 开团（商品须配置拼团价）
router.post("/groupons", auth(), asyncHandler(async (req, res) => {
  const product = store.get("products", req.body.productId);
  if (!product || product.status !== "on") return fail(404, 404, "商品不存在");
  if (!product.grouponPrice) return fail(400, 400, "该商品暂未开通拼团");
  const sku = store.find("productSkus", (s) => s.productId === product.id)[0];
  if (!sku || sku.stock < 1) return fail(400, 400, "库存不足");
  const targetSize = Math.min(10, Math.max(2, Number(req.body.targetSize) || 3));
  const hours = Math.min(72, Math.max(1, Number(req.body.hours) || 24));
  const g = store.insert("groupons", {
    grouponNo: "GP" + uid(10).toUpperCase(),
    productId: product.id, skuId: sku.id, merchantId: product.merchantId,
    leaderId: req.user.id,
    groupPrice: product.grouponPrice,
    targetSize, currentSize: 0,
    status: "open",
    deadline: new Date(Date.now() + hours * 3600000).toISOString(),
    createdAt: now(), successAt: null, orderIds: [],
  });
  // 团长默认参团
  await joinGroup(req, res, g.id);
}));

async function joinGroup(req, res, groupId) {
  const g = store.get("groupons", groupId);
  if (!g) return fail(404, 404, "拼团不存在");
  if (g.status !== "open") return fail(400, 400, "该团已" + (g.status === "success" ? "成团" : "结束"));
  if (Date.now() > new Date(g.deadline).getTime()) { store.update("groupons", g.id, { status: "failed" }); return fail(400, 400, "拼团已超时"); }
  if (g.currentSize >= g.targetSize) return fail(400, 400, "该团已满员");
  const product = store.get("products", g.productId);
  const sku = store.get("productSkus", g.skuId);
  if (!sku || sku.stock < 1) return fail(400, 400, "库存不足");
  const address = store.findOne("addresses", (a) => a.userId === req.user.id);
  if (!address) return fail(400, 400, "请先添加收货地址");
  store.update("productSkus", sku.id, { stock: sku.stock - 1 });
  store.update("products", product.id, { stock: Math.max(0, product.stock - 1) });
  const order = store.insert("orders", {
    orderNo: orderNo(), userId: req.user.id, merchantId: g.merchantId, status: "pending_payment",
    totalAmount: g.groupPrice, discountAmount: 0, couponId: null, couponAmount: 0, payableAmount: g.groupPrice,
    currency: "CNY", paymentMethod: null, grouponId: g.id,
    address: { name: address.name, phone: address.phone, province: address.province || "", city: address.city || "", district: address.district || "", detail: address.detail },
    remark: "拼团订单（" + g.grouponNo + "）",
    paidAt: null, shippedAt: null, completedAt: null,
  });
  store.insert("orderItems", { orderId: order.id, productId: product.id, skuId: sku.id, productName: product.name, skuName: sku.name, image: product.mainImage, price: g.groupPrice, quantity: 1, subtotal: g.groupPrice });
  store.update("groupons", g.id, { currentSize: g.currentSize + 1, orderIds: [...(g.orderIds || []), order.id] });
  const g2 = store.get("groupons", g.id);
  if (g2.currentSize >= g2.targetSize) {
    store.update("groupons", g2.id, { status: "success", successAt: now() });
    // 通知全体团员
    (g2.orderIds || []).forEach((oid) => {
      const o = store.get("orders", oid);
      if (o && req.app.locals.ws) req.app.locals.ws.publishToUser(o.userId, { type: "notify", data: { title: "拼团成功", body: "团 " + g2.grouponNo + " 已成团，请尽快完成支付" } });
    });
  }
  res.json(ok({ groupon: ser(g2), order: serializeOrder(store.get("orders", order.id)) }));
}

// 参团
router.post("/groupons/:id/join", auth(), asyncHandler(async (req, res) => {
  await joinGroup(req, res, req.params.id);
}));

// 浏览拼团（进行中）
router.get("/groupons", asyncHandler(async (req, res) => {
  const status = req.query.status || "open";
  const list = store.find("groupons", (g) => g.status === status).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(ok(paginate(list.map(ser), req.query.page, req.query.pageSize)));
}));

// 拼团详情
router.get("/groupons/:id", asyncHandler(async (req, res) => {
  const g = store.get("groupons", req.params.id);
  if (!g) return fail(404, 404, "拼团不存在");
  res.json(ok(ser(g)));
}));

// 我参与的拼团
router.get("/my/groupons", auth(), asyncHandler(async (req, res) => {
  const list = store.find("orders", (o) => o.userId === req.user.id && o.grouponId).map((o) => {
    const g = store.get("groupons", o.grouponId);
    return { orderId: o.id, orderNo: o.orderNo, status: o.status, groupon: g ? ser(g) : null };
  });
  res.json(ok(list));
}));

export default router;
