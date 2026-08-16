import { Router } from "express";
import store from "../../_shared/store.js";
import { asyncHandler, ok } from "../../_shared/util.js";
import { serializeProduct, ensureMerchants } from "./common.js";
import { callInternal } from "../../_shared/internal-client.js";

const router = Router();

// 智能推荐（规则引擎 MVP）—— 跨服务读取：用户/订单/购物车信号均经内部接口获取
router.get("/", asyncHandler(async (req, res) => {
  const { scene = "home", productId, limit = 10, currency } = req.query;
  const N = Math.min(20, Math.max(1, Number(limit) || 10));
  const onSale = store.find("products", (p) => p.status === "on");
  const scored = new Map();
  const bump = (id, s) => scored.set(id, (scored.get(id) || 0) + s);

  onSale.forEach((p) => bump(p.id, p.sales * 10 + (p.rating || 0) * 50));

  let user = null;
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (token) {
    try {
      const { verifyToken } = await import("../_shared/util.js");
      const payload = verifyToken(token);
      user = await callInternal("auth", "GET", "/internal/users/" + payload.id);
    } catch {}
  }
  if (user) {
    // 已支付订单（trade 服务）
    const orders = await callInternal("trade", "GET", "/internal/orders/query", null, { userId: user.id, status: "paid,shipped,completed,refunding" }).catch(() => ({ list: [] }));
    const orderIds = (orders.list || []).map((o) => o.id);
    let items = [];
    if (orderIds.length) {
      const ri = await callInternal("trade", "GET", "/internal/order-items", null, { orderIds: orderIds.join(",") }).catch(() => ({ list: [] }));
      items = ri.list || [];
    }
    const boughtIds = new Set();
    const catPref = {};
    items.forEach((it) => {
      boughtIds.add(it.productId);
      const p = store.get("products", it.productId);
      if (p) catPref[p.categoryId] = (catPref[p.categoryId] || 0) + it.quantity;
    });
    // 协同过滤：买过同商品的人也买
    if (productId) {
      const coIds = items.filter((it) => Number(it.productId) === Number(productId)).map((it) => it.orderId);
      items.forEach((it) => {
        if (coIds.includes(it.orderId) && Number(it.productId) !== Number(productId)) bump(it.productId, 300);
      });
    }
    Object.entries(catPref).forEach(([cid, s]) => {
      onSale.filter((p) => p.categoryId === Number(cid)).forEach((p) => bump(p.id, s * 20));
    });
    boughtIds.forEach((id) => scored.delete(id));
    // 购物车场景：延伸品类
    if (scene === "cart") {
      const cart = await callInternal("cart", "GET", "/internal/cart/" + user.id).catch(() => ({ items: [] }));
      (cart.items || []).forEach((c) => {
        const p = store.get("products", c.productId);
        if (p) onSale.filter((x) => x.categoryId === p.categoryId && x.id !== p.id).forEach((x) => bump(x.id, 150));
      });
    }
  }

  if (productId) {
    const p = store.get("products", productId);
    if (p) onSale.filter((x) => x.categoryId === p.categoryId && x.id !== p.id).forEach((x) => bump(x.id, 200));
  }

  await ensureMerchants();
  const list = [...scored.entries()].sort((a, b) => b[1] - a[1]).slice(0, N).map(([id]) => store.get("products", id)).filter(Boolean).map((p) => serializeProduct(p, currency));
  res.json(ok({ scene, list }));
}));

export default router;
