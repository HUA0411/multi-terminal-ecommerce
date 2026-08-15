import { Router } from "express";
import store from "../store.js";
import { auth } from "../middleware.js";
import { asyncHandler, ok, fail, paginate, now } from "../util.js";
import { serializeProduct } from "./common.js";

const publicRouter = Router();
const adminRouter = Router();
adminRouter.use(auth("admin", "merchant"));

// 获取已发布页面（公开）
publicRouter.get("/pages/:key", asyncHandler(async (req, res) => {
  const page = store.findOne("cmsPages", (p) => p.key === req.params.key && p.status === "published");
  if (!page) return fail(404, 404, "页面不存在或未发布");
  // 渲染商品/活动块
  const blocks = page.blocks.map((b) => {
    if (b.type === "goods") {
      const ids = (b.props.productIds || []);
      const products = ids.map((id) => store.get("products", id)).filter(Boolean).map((p) => serializeProduct(p, req.query.currency));
      return { ...b, props: { ...b.props, products } };
    }
    if (b.type === "flashsale") {
      // 进行中的秒杀活动（含剩余量/进度，前端可直接渲染倒计时）
      const nowT = Date.now();
      const limit = Math.min(Number(b.props.count) || 4, 12);
      const items = store.all("flashSales").filter((f) => f.status === "active" && new Date(f.startAt) <= nowT && new Date(f.endAt) >= nowT)
        .slice(0, limit)
        .map((f) => {
          const p = store.get("products", f.productId);
          return {
            id: f.id, productId: f.productId, productName: p ? p.name : "", image: p ? p.mainImage : "",
            flashPrice: f.flashPrice, originalPrice: p ? p.price : 0, quota: f.quota, sold: f.sold,
            startAt: f.startAt, endAt: f.endAt, remaining: Math.max(0, f.quota - f.sold),
          };
        });
      return { ...b, props: { ...b.props, items } };
    }
    if (b.type === "groupon") {
      // 拼团中（未成团/未失败）的活动
      const limit = Math.min(Number(b.props.count) || 4, 12);
      const items = store.find("groupons", (g) => g.status === "open")
        .sort((a, b2) => new Date(b2.createdAt) - new Date(a.createdAt))
        .slice(0, limit)
        .map((g) => {
          const p = store.get("products", g.productId);
          return {
            id: g.id, grouponNo: g.grouponNo, productId: g.productId, productName: p ? p.name : "",
            productImage: p ? p.mainImage : "", groupPrice: g.groupPrice, originalPrice: p ? p.price : 0,
            targetSize: g.targetSize, currentSize: g.currentSize,
            status: g.status, statusText: "拼团中", createdAt: g.createdAt, deadline: g.deadline,
          };
        });
      return { ...b, props: { ...b.props, items } };
    }
    return b;
  });
  res.json(ok({ key: page.key, title: page.title, blocks, updatedAt: page.updatedAt }));
}));

publicRouter.get("/templates", asyncHandler(async (req, res) => {
  res.json(ok(store.all("cmsTemplates")));
}));

adminRouter.get("/pages", asyncHandler(async (req, res) => {
  const list = store.all("cmsPages").sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json(ok(paginate(list, req.query.page, req.query.pageSize)));
}));

adminRouter.post("/pages", asyncHandler(async (req, res) => {
  const { key, title, blocks, status = "draft" } = req.body || {};
  if (!key || !title) return fail(400, 400, "key 和 title 必填");
  if (store.findOne("cmsPages", (p) => p.key === key)) return fail(409, 409, "页面 key 已存在");
  const page = store.insert("cmsPages", { key, title, status, blocks: Array.isArray(blocks) ? blocks : [], updatedBy: req.user.id, updatedAt: now() });
  res.json(ok(page));
}));

adminRouter.put("/pages/:id", asyncHandler(async (req, res) => {
  const page = store.get("cmsPages", req.params.id);
  if (!page) return fail(404, 404, "页面不存在");
  const patch = { updatedBy: req.user.id, updatedAt: now() };
  if (req.body.title !== undefined) patch.title = req.body.title;
  if (req.body.blocks !== undefined) patch.blocks = req.body.blocks;
  if (req.body.status !== undefined) patch.status = req.body.status;
  const updated = store.update("cmsPages", page.id, patch);
  res.json(ok(updated));
}));

adminRouter.delete("/pages/:id", asyncHandler(async (req, res) => {
  const page = store.get("cmsPages", req.params.id);
  if (!page) return fail(404, 404, "页面不存在");
  store.remove("cmsPages", page.id);
  res.json(ok({ removed: true }));
}));

adminRouter.post("/pages/:id/publish", asyncHandler(async (req, res) => {
  const page = store.get("cmsPages", req.params.id);
  if (!page) return fail(404, 404, "页面不存在");
  store.update("cmsPages", page.id, { status: "published", updatedBy: req.user.id, updatedAt: now() });
  res.json(ok(store.get("cmsPages", page.id)));
}));

export { publicRouter as cmsPublicRouter, adminRouter as cmsAdminRouter };