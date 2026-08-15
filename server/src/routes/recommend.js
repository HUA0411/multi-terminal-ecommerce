import { Router } from "express";
import store from "../store.js";
import { auth } from "../middleware.js";
import { asyncHandler, ok } from "../util.js";
import { serializeProduct } from "./common.js";

const router = Router();

// 智能推荐（规则引擎 MVP）
// - scene=home: 热门商品 + 用户品类偏好
// - scene=detail: 同类商品 + 协同（买过该商品的人还买）
// - scene=cart: 购物车商品品类延伸
router.get("/", asyncHandler(async (req, res) => {
  const { scene = "home", productId, limit = 10, currency } = req.query;
  const N = Math.min(20, Math.max(1, Number(limit) || 10));
  const onSale = store.find("products", (p) => p.status === "on");
  const scored = new Map(); // productId -> score
  const bump = (id, s) => scored.set(id, (scored.get(id) || 0) + s);

  // 热门基础分
  onSale.forEach((p) => bump(p.id, p.sales * 10 + (p.rating || 0) * 50));

  let user = null;
  // 用户购买历史 + 品类偏好（登录时生效）
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (token) {
    try {
      const { verifyToken } = await import("../util.js");
      const payload = verifyToken(token);
      user = store.get("users", payload.id);
    } catch {}
  }
  if (user) {
    const bought = store.find("orders", (o) => o.userId === user.id && ["paid", "shipped", "completed", "refunding"].includes(o.status));
    const boughtIds = new Set();
    const catPref = {};
    store.all("orderItems").forEach((it) => {
      if (!bought.some((o) => o.id === it.orderId)) return;
      boughtIds.add(it.productId);
      const p = store.get("products", it.productId);
      if (p) catPref[p.categoryId] = (catPref[p.categoryId] || 0) + it.quantity;
    });
    // 协同过滤：买过同商品的人也买（简单共现）
    if (productId) {
      const coBuyers = store.find("orderItems", (it) => it.productId === Number(productId)).map((it) => it.orderId);
      store.all("orderItems").forEach((it) => {
        if (coBuyers.includes(it.orderId) && it.productId !== Number(productId)) bump(it.productId, 300);
      });
    }
    // 品类偏好
    Object.entries(catPref).forEach(([cid, s]) => {
      onSale.filter((p) => p.categoryId === Number(cid)).forEach((p) => bump(p.id, s * 20));
    });
    // 去重已购
    boughtIds.forEach((id) => scored.delete(id));
  }

  // 详情页：同类商品加权
  if (productId) {
    const p = store.get("products", productId);
    if (p) onSale.filter((x) => x.categoryId === p.categoryId && x.id !== p.id).forEach((x) => bump(x.id, 200));
  }

  // 购物车场景：延伸品类
  if (scene === "cart" && user) {
    const cart = store.find("cartItems", (c) => c.userId === user.id);
    cart.forEach((c) => {
      const sku = store.get("productSkus", c.skuId);
      const p = sku ? store.get("products", sku.productId) : null;
      if (p) onSale.filter((x) => x.categoryId === p.categoryId && x.id !== p.id).forEach((x) => bump(x.id, 150));
    });
  }

  const list = [...scored.entries()].sort((a, b) => b[1] - a[1]).slice(0, N).map(([id]) => store.get("products", id)).filter(Boolean).map((p) => serializeProduct(p, currency));
  res.json(ok({ scene, list }));
}));

export default router;
