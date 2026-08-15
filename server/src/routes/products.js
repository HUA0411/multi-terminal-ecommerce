import { Router } from "express";
import store from "../store.js";
import { cache } from "../middleware.js";
import { asyncHandler, ok, fail, paginate } from "../util.js";
import { serializeProduct, convert } from "./common.js";

const router = Router();

// 商品列表 / 搜索 / 筛选 / 排序
router.get("/", asyncHandler(async (req, res) => {
  const { keyword, categoryId, merchantId, minPrice, maxPrice, sort = "default", page, pageSize, currency, status = "on", tags } = req.query;
  const cacheKey = `products:${JSON.stringify(req.query)}`;
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(ok(cached));

  let list = store.all("products").filter((p) => {
    if (status && p.status !== status) return false;
    if (merchantId && Number(p.merchantId) !== Number(merchantId)) return false;
    if (keyword) {
      const k = String(keyword).toLowerCase();
      if (!(p.name.toLowerCase().includes(k) || (p.subtitle || "").toLowerCase().includes(k) || (p.tags || []).some((t) => t.toLowerCase().includes(k)))) return false;
    }
    if (categoryId) {
      const cid = Number(categoryId);
      const cat = store.get("categories", cid);
      const childIds = cat ? store.find("categories", (c) => c.parentId === cid).map((c) => c.id) : [];
      if (p.categoryId !== cid && !childIds.includes(p.categoryId)) return false;
    }
    if (minPrice !== undefined && p.price < Number(minPrice)) return false;
    if (maxPrice !== undefined && p.price > Number(maxPrice)) return false;
    if (tags) {
      const ts = String(tags).split(",");
      if (!ts.every((t) => (p.tags || []).includes(t))) return false;
    }
    return true;
  });

  switch (sort) {
    case "price_asc": list.sort((a, b) => a.price - b.price); break;
    case "price_desc": list.sort((a, b) => b.price - a.price); break;
    case "sales": list.sort((a, b) => b.sales - a.sales); break;
    case "new": list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
    default: list.sort((a, b) => b.sales - a.sales);
  }

  const result = paginate(list.map((p) => serializeProduct(p, currency)), page, pageSize);
  await cache.set(cacheKey, result, 15_000);
  res.json(ok(result));
}));

// 商品详情（含 SKU、商家、推荐）
router.get("/:id", asyncHandler(async (req, res) => {
  const p = store.get("products", req.params.id);
  if (!p || p.status !== "on") return fail(404, 404, "商品不存在或已下架");
  const currency = req.query.currency;
  const merchant = store.get("merchants", p.merchantId);
  const skus = store.find("productSkus", (s) => s.productId === p.id).map((s) => ({ id: s.id, name: s.name, specValues: s.specValues, price: convert(s.price, "CNY", currency), stock: s.stock, code: s.code }));
  // 相关推荐
  const sameCat = store.find("products", (x) => x.categoryId === p.categoryId && x.id !== p.id && x.status === "on").slice(0, 4);
  const recommendations = sameCat.map((x) => serializeProduct(x, currency));
  res.json(ok({ ...serializeProduct(p, currency), skus, merchant: merchant ? { id: merchant.id, name: merchant.name, logo: merchant.logo, rating: merchant.rating, description: merchant.description } : null, recommendations }));
}));

// 分类树
const categoriesRouter = Router();
categoriesRouter.get("/", asyncHandler(async (req, res) => {
  const all = store.all("categories");
  const build = (parentId) => all.filter((c) => c.parentId === parentId).map((c) => ({ id: c.id, name: c.name, icon: c.icon, children: build(c.id) }));
  res.json(ok(build(0)));
}));

// 搜索联想
const searchRouter = Router();
searchRouter.get("/suggest", asyncHandler(async (req, res) => {
  const k = String(req.query.keyword || "").toLowerCase();
  if (!k) return res.json(ok({ keywords: [] }));
  const names = store.all("products").filter((p) => p.status === "on" && p.name.toLowerCase().includes(k)).slice(0, 8).map((p) => p.name);
  res.json(ok({ keywords: names }));
}));

export { router as productRouter, categoriesRouter, searchRouter };
