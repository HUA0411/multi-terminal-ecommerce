import { Router } from "express";
import store from "../../_shared/store.js";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok, fail, paginate, uid, now } from "../../_shared/util.js";
import { callInternal } from "../../_shared/internal-client.js";
import { publishToUser } from "../../_shared/publisher.js";

const router = Router();

async function ser(g) {
  let productName = "", productImage = "", originalPrice = 0, leaderName = "", merchantName = "";
  try {
    const prod = await callInternal("catalog", "GET", "/internal/products/" + g.productId);
    if (prod && prod.product) { productName = prod.product.name; productImage = prod.product.mainImage; originalPrice = prod.product.price; }
  } catch {}
  try {
    const leader = await callInternal("auth", "GET", "/internal/users/" + g.leaderId);
    if (leader) leaderName = leader.nickname || "";
  } catch {}
  try {
    const m = await callInternal("merchant", "GET", "/internal/merchants/" + g.merchantId);
    if (m) merchantName = m.name || "";
  } catch {}
  return {
    id: g.id, grouponNo: g.grouponNo, productId: g.productId, productName,
    productImage, groupPrice: g.groupPrice, originalPrice,
    targetSize: g.targetSize, currentSize: g.currentSize,
    status: g.status, statusText: { open: "拼团中", success: "已成团", failed: "未成团" }[g.status] || g.status,
    leaderName, merchantName,
    deadline: g.deadline, createdAt: g.createdAt,
  };
}

// 开团
router.post("/groupons", auth(), asyncHandler(async (req, res) => {
  const prod = await callInternal("catalog", "GET", "/internal/products/" + req.body.productId).catch(() => null);
  if (!prod || !prod.product || prod.product.status !== "on") return fail(404, 404, "商品不存在");
  if (!prod.product.grouponPrice) return fail(400, 400, "该商品暂未开通拼团");
  const sku = (prod.skus || [])[0];
  if (!sku || sku.stock < 1) return fail(400, 400, "库存不足");
  const targetSize = Math.min(10, Math.max(2, Number(req.body.targetSize) || 3));
  const hours = Math.min(72, Math.max(1, Number(req.body.hours) || 24));
  const g = store.insert("groupons", {
    grouponNo: "GP" + uid(10).toUpperCase(),
    productId: Number(req.body.productId), skuId: sku.id, merchantId: prod.product.merchantId,
    leaderId: req.user.id,
    groupPrice: prod.product.grouponPrice,
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
  const prod = await callInternal("catalog", "GET", "/internal/products/" + g.productId).catch(() => null);
  const sku = prod ? (prod.skus || []).find((s) => Number(s.id) === Number(g.skuId)) : null;
  if (!sku || sku.stock < 1) return fail(400, 400, "库存不足");
  const address = await callInternal("auth", "GET", "/internal/addresses/" + req.user.id + "/default").catch(() => null);
  if (!address) return fail(400, 400, "请先添加收货地址");
  // 生成拼团订单（trade 内部接口：扣库存 + 落单）
  const order = await callInternal("trade", "POST", "/internal/orders/direct", {
    userId: req.user.id,
    merchantId: g.merchantId,
    totalAmount: g.groupPrice, discountAmount: 0, couponId: null, couponAmount: 0,
    payableAmount: g.groupPrice,
    currency: "CNY",
    remark: "拼团订单（" + g.grouponNo + "）",
    grouponId: g.id,
    address: { name: address.name, phone: address.phone, province: address.province || "", city: address.city || "", district: address.district || "", detail: address.detail },
    items: [{ productId: g.productId, skuId: g.skuId, productName: prod ? prod.product.name : "", skuName: sku ? sku.name : "", image: prod ? prod.product.mainImage : "", price: g.groupPrice, quantity: 1 }],
  });
  store.update("groupons", g.id, { currentSize: g.currentSize + 1, orderIds: [...(g.orderIds || []), order.id] });
  const g2 = store.get("groupons", g.id);
  if (g2.currentSize >= g2.targetSize) {
    store.update("groupons", g2.id, { status: "success", successAt: now() });
    // 通知全体团员
    (g2.orderIds || []).forEach((oid) => {
      callInternal("trade", "GET", "/internal/orders/query", null, { id: oid }).then((r) => {
        const o = (r && r.list && r.list[0]);
        if (o) publishToUser(o.userId, { type: "notify", data: { title: "拼团成功", body: "团 " + g2.grouponNo + " 已成团，请尽快完成支付" } });
      }).catch(() => {});
    });
  }
  res.json(ok({ groupon: await ser(g2), order }));
}

router.post("/groupons/:id/join", auth(), asyncHandler(async (req, res) => {
  await joinGroup(req, res, req.params.id);
}));

router.get("/groupons", asyncHandler(async (req, res) => {
  const status = req.query.status || "open";
  const list = store.find("groupons", (g) => g.status === status).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const out = [];
  for (const g of list) out.push(await ser(g));
  res.json(ok(paginate(out, req.query.page, req.query.pageSize)));
}));

router.get("/groupons/:id", asyncHandler(async (req, res) => {
  const g = store.get("groupons", req.params.id);
  if (!g) return fail(404, 404, "拼团不存在");
  res.json(ok(await ser(g)));
}));

// 我参与的拼团（订单归属在 trade）
router.get("/my/groupons", auth(), asyncHandler(async (req, res) => {
  const orders = await callInternal("trade", "GET", "/internal/orders/query", null, { userId: req.user.id }).catch(() => ({ list: [] }));
  const mine = (orders.list || []).filter((o) => o.grouponId);
  const out = [];
  for (const o of mine) {
    const g = store.get("groupons", o.grouponId);
    out.push({ orderId: o.id, orderNo: o.orderNo, status: o.status, groupon: g ? await ser(g) : null });
  }
  res.json(ok(out));
}));

export default router;
