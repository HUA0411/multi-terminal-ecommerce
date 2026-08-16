import { Router } from "express";
import store from "../../_shared/store.js";
import { internalHandler } from "../../_shared/app-factory.js";
import { ApiError } from "../../_shared/util.js";
import { serializeProduct, convert, rates } from "./common.js";

const router = Router();

function productFull(p) {
  const skus = store.find("productSkus", (s) => s.productId === p.id).map((s) => ({ id: s.id, name: s.name, specValues: s.specValues, price: s.price, stock: s.stock, code: s.code }));
  return { product: serializeProduct(p, undefined, { showTiers: true }), skus, wholesaleTiers: p.wholesaleTiers || null };
}

// 汇率表（属主）
router.get("/rates", internalHandler(() => rates()));

// 批量商品（字面路径在 /products/:id 之前）
router.get("/products/batch", internalHandler(({ query }) => {
  const ids = String(query.ids || "").split(",").map((s) => Number(s.trim())).filter(Boolean);
  const list = ids.map((id) => store.get("products", id)).filter(Boolean).map((p) => productFull(p));
  return { list };
}));

// 商品查询（库存/商家过滤，看板低库存用）
router.get("/products/query", internalHandler(({ query }) => {
  let list = store.all("products");
  if (query.merchantId) list = list.filter((p) => Number(p.merchantId) === Number(query.merchantId));
  if (query.maxStock !== undefined) list = list.filter((p) => p.stock <= Number(query.maxStock));
  if (query.status) list = list.filter((p) => p.status === query.status);
  return { list: list.map((p) => serializeProduct(p)) };
}));

// 商品详情（含 skus + 阶梯价 + 商家名）
router.get("/products/:id", internalHandler(({ params }) => {
  const p = store.get("products", params.id);
  if (!p) throw new ApiError(404, 404, "商品不存在");
  return productFull(p);
}));

// SKU + 商品（购物车/下单链路用）
router.get("/skus/:id", internalHandler(({ params }) => {
  const sku = store.get("productSkus", params.id);
  if (!sku) throw new ApiError(404, 404, "SKU 不存在");
  const p = store.get("products", sku.productId);
  return { sku: { id: sku.id, productId: sku.productId, name: sku.name, specValues: sku.specValues, price: sku.price, stock: sku.stock, code: sku.code }, product: p || null };
}));

// 库存调整（delta 正加负减）
router.post("/products/:id/stock", internalHandler(({ params, body }) => {
  const p = store.get("products", params.id);
  if (!p) throw new ApiError(404, 404, "商品不存在");
  const delta = Math.round(Number(body && body.delta) || 0);
  store.update("products", p.id, { stock: Math.max(0, p.stock + delta) });
  return { id: p.id, stock: store.get("products", p.id).stock };
}));

// SKU 库存调整（联动商品总库存）
router.post("/skus/:id/stock", internalHandler(({ params, body }) => {
  const sku = store.get("productSkus", params.id);
  if (!sku) throw new ApiError(404, 404, "SKU 不存在");
  const delta = Math.round(Number(body && body.delta) || 0);
  store.update("productSkus", sku.id, { stock: Math.max(0, sku.stock + delta) });
  const p = store.get("products", sku.productId);
  if (p) {
    const sum = store.find("productSkus", (s) => s.productId === p.id).reduce((s, x) => s + x.stock, 0);
    store.update("products", p.id, { stock: sum });
  }
  const cur = store.get("productSkus", sku.id);
  return { id: sku.id, stock: cur.stock };
}));

// 销量累加（支付成功回调）
router.post("/products/:id/sales", internalHandler(({ params, body }) => {
  const p = store.get("products", params.id);
  if (!p) throw new ApiError(404, 404, "商品不存在");
  const delta = Math.round(Number(body && body.delta) || 0);
  store.update("products", p.id, { sales: (p.sales || 0) + delta });
  return { id: p.id, sales: store.get("products", p.id).sales };
}));

// 分类树
router.get("/categories", internalHandler(() => {
  const all = store.all("categories");
  const build = (parentId) => all.filter((c) => c.parentId === parentId).map((c) => ({ id: c.id, name: c.name, icon: c.icon, children: build(c.id) }));
  return { tree: build(0) };
}));

// 币种换算
router.get("/convert", internalHandler(({ query }) => ({
  converted: convert(Math.round(Number(query.amount) || 0), query.from || "CNY", query.to || "CNY"),
})));

export default router;
