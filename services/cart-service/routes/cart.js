import { Router } from "express";
import store from "../../_shared/store.js";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok, fail } from "../../_shared/util.js";
import { cartSummary, ensureSku, ensureRates } from "./common.js";
import { publishToUser } from "../../_shared/publisher.js";

const router = Router();
router.use(auth());

async function pushCart(userId, user) {
  const s = cartSummary(userId, undefined, user);
  await publishToUser(userId, { type: "cart:changed", data: { totalQuantity: s.totalQuantity, updatedAt: new Date().toISOString() } });
}

router.get("/", asyncHandler(async (req, res) => {
  if (req.query.currency && req.query.currency !== "CNY") await ensureRates();
  res.json(ok(cartSummary(req.user.id, req.query.currency, req.user)));
}));

router.post("/items", asyncHandler(async (req, res) => {
  const { skuId, quantity = 1, checked = true } = req.body || {};
  const hit = await ensureSku(skuId);
  if (!hit || !hit.sku) return fail(404, 404, "SKU 不存在");
  const sku = hit.sku;
  const product = hit.product;
  if (!product || product.status !== "on") return fail(404, 404, "商品已下架");
  const qty = Math.max(1, Math.min(99, Number(quantity) || 1));
  if (qty > sku.stock) return fail(400, 400, "库存不足");
  let item = store.findOne("cartItems", (c) => c.userId === req.user.id && c.skuId === sku.id);
  if (item) {
    const nq = Math.min(99, item.quantity + qty);
    if (nq > sku.stock) return fail(400, 400, "库存不足");
    store.update("cartItems", item.id, { quantity: nq, checked });
  } else {
    item = store.insert("cartItems", { userId: req.user.id, skuId: sku.id, quantity: qty, checked });
  }
  await pushCart(req.user.id, req.user);
  res.json(ok(cartSummary(req.user.id, undefined, req.user)));
}));

router.put("/items/:id", asyncHandler(async (req, res) => {
  const item = store.get("cartItems", req.params.id);
  if (!item || item.userId !== req.user.id) return fail(404, 404, "购物车项不存在");
  const patch = {};
  if (req.body.quantity !== undefined) {
    const qty = Math.max(1, Math.min(99, Number(req.body.quantity) || 1));
    const hit = await ensureSku(item.skuId);
    const sku = hit ? hit.sku : null;
    if (sku && qty > sku.stock) return fail(400, 400, "库存不足");
    patch.quantity = qty;
  }
  if (req.body.checked !== undefined) patch.checked = !!req.body.checked;
  store.update("cartItems", item.id, patch);
  await pushCart(req.user.id, req.user);
  res.json(ok(cartSummary(req.user.id, undefined, req.user)));
}));

router.delete("/items/:id", asyncHandler(async (req, res) => {
  const item = store.get("cartItems", req.params.id);
  if (!item || item.userId !== req.user.id) return fail(404, 404, "购物车项不存在");
  store.remove("cartItems", item.id);
  await pushCart(req.user.id, req.user);
  res.json(ok(cartSummary(req.user.id, undefined, req.user)));
}));

router.delete("/", asyncHandler(async (req, res) => {
  store.removeWhere("cartItems", (c) => c.userId === req.user.id);
  await pushCart(req.user.id, req.user);
  res.json(ok(cartSummary(req.user.id, undefined, req.user)));
}));

// 游客购物车合并（登录后调用）
router.post("/merge", asyncHandler(async (req, res) => {
  const items = (req.body && req.body.items) || [];
  for (const it of items) {
    const hit = await ensureSku(it.skuId);
    const sku = hit ? hit.sku : null;
    if (!sku) continue;
    const exist = store.findOne("cartItems", (c) => c.userId === req.user.id && c.skuId === sku.id);
    const qty = Math.max(1, Math.min(99, Number(it.quantity) || 1));
    if (exist) store.update("cartItems", exist.id, { quantity: Math.min(99, exist.quantity + qty) });
    else store.insert("cartItems", { userId: req.user.id, skuId: sku.id, quantity: qty, checked: true });
  }
  await pushCart(req.user.id, req.user);
  res.json(ok(cartSummary(req.user.id, undefined, req.user)));
}));

export default router;