import { Router } from "express";
import store from "../../_shared/store.js";
import { auth, optionalAuth } from "../../_shared/middleware.js";
import { callInternal } from "../../_shared/internal-client.js";
import { asyncHandler, ok, fail, paginate, now } from "../../_shared/util.js";

const router = Router();

// ============ 商品评价 ============
function avgRating(productId) {
  const reviews = store.find("reviews", (r) => r.productId === productId && r.status === "active");
  if (!reviews.length) return 0;
  return Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
}

// 发表评价（须购买过该商品且订单已完成）
router.post("/products/:id/reviews", auth(), asyncHandler(async (req, res) => {
  const product = store.get("products", req.params.id);
  if (!product) return fail(404, 404, "商品不存在");
  const rating = Math.round(Number(req.body.rating));
  if (!rating || rating < 1 || rating > 5) return fail(400, 400, "评分须为 1-5");
  const content = String(req.body.content || "").slice(0, 500);
  // 校验购买记录：订单已完成且含该商品
  let bought = false;
  try {
    const chk = await callInternal("trade", "GET", "/internal/purchase-check", null, { userId: req.user.id, productId: product.id });
    bought = !!(chk && chk.bought);
  } catch {}
  if (!bought) return fail(403, 403, "仅已完成的购买订单可评价");
  let nickname = req.user.nickname || "";
  let avatar = "";
  try {
    const fu = await callInternal("auth", "GET", "/internal/users/" + req.user.id);
    if (fu) { nickname = fu.nickname || nickname; avatar = fu.avatar || ""; }
  } catch {}
  const review = store.insert("reviews", { productId: product.id, userId: req.user.id, nickname, avatar, rating, content, status: "active", createdAt: now() });
  // 更新商品评分（最近评价平均）
  const avg = avgRating(product.id);
  store.update("products", product.id, { rating: avg || product.rating });
  res.json(ok({ ...review, productRating: avg }));
}));

// 商品评价列表（公开）
router.get("/products/:id/reviews", optionalAuth, asyncHandler(async (req, res) => {
  const product = store.get("products", req.params.id);
  if (!product) return fail(404, 404, "商品不存在");
  const list = store.find("reviews", (r) => r.productId === product.id && r.status === "active").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const result = paginate(list.map((r) => ({ id: r.id, nickname: r.nickname, avatar: r.avatar, rating: r.rating, content: r.content, createdAt: r.createdAt })), req.query.page, req.query.pageSize);
  const avg = avgRating(product.id);
  res.json(ok({ ...result, rating: avg, reviewCount: list.length }));
}));

// ============ 收藏夹 ============
router.get("/favorites", auth(), asyncHandler(async (req, res) => {
  const list = store.find("favorites", (f) => f.userId === req.user.id).map((f) => {
    const p = store.get("products", f.productId);
    return { id: f.id, productId: f.productId, product: p ? { id: p.id, name: p.name, mainImage: p.mainImage, price: p.price, sales: p.sales } : null, createdAt: f.createdAt };
  }).filter((f) => f.product);
  res.json(ok(list));
}));

router.post("/favorites", auth(), asyncHandler(async (req, res) => {
  const { productId } = req.body || {};
  const p = store.get("products", productId);
  if (!p) return fail(404, 404, "商品不存在");
  if (store.findOne("favorites", (f) => f.userId === req.user.id && f.productId === p.id)) return res.json(ok({ favorited: true, already: true }));
  store.insert("favorites", { userId: req.user.id, productId: p.id, createdAt: now() });
  res.json(ok({ favorited: true, productId: p.id }));
}));

router.delete("/favorites/:productId", auth(), asyncHandler(async (req, res) => {
  store.removeWhere("favorites", (f) => f.userId === req.user.id && Number(f.productId) === Number(req.params.productId));
  res.json(ok({ favorited: false }));
}));

export default router;