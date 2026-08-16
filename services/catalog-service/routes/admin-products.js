import { Router } from "express";
import store from "../../_shared/store.js";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok, fail, paginate } from "../../_shared/util.js";
import { auditLog } from "../../_shared/audit.js";
import { serializeProduct } from "./common.js";

const router = Router();
router.use(auth("admin", "merchant"));

function assertMerchant(user, merchantId) {
  if (user.role === "merchant" && merchantId !== user.merchantId) return fail(403, 403, "无权操作其他商家资源");
}

router.get("/products", asyncHandler(async (req, res) => {
  let list = store.all("products");
  if (req.user.role === "merchant") list = list.filter((p) => p.merchantId === req.user.merchantId);
  res.json(ok(paginate(list.map((p) => serializeProduct(p)), req.query.page, req.query.pageSize)));
}));

router.post("/products", asyncHandler(async (req, res) => {
  const { name, categoryId, price, stock, mainImage, description, subtitle, merchantId } = req.body || {};
  if (!name || !categoryId || !price) return fail(400, 400, "名称/分类/价格必填");
  const mid = req.user.role === "merchant" ? req.user.merchantId : (merchantId || 1);
  auditLog(req.user, "product.create", name, { merchantId: mid }, req.ip);
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
  auditLog(req.user, "product.off", "product:" + p.id, {}, req.ip);
  res.json(ok({ removed: true }));
}));

// B2B 批发阶梯价
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
  auditLog(req.user, "product.tiers", "product:" + p.id, { tiers: clean }, req.ip);
  res.json(ok({ id: p.id, wholesaleTiers: clean }));
}));

export default router;
