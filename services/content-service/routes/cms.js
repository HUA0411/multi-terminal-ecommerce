import { Router } from "express";
import store from "../../_shared/store.js";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok, fail, paginate, now } from "../../_shared/util.js";
import { callInternal } from "../../_shared/internal-client.js";

const publicRouter = Router();
const adminRouter = Router();
adminRouter.use(auth("admin", "merchant"));

// 获取已发布页面（公开）
publicRouter.get("/pages/:key", asyncHandler(async (req, res) => {
  const page = store.findOne("cmsPages", (p) => p.key === req.params.key && p.status === "published");
  if (!page) return fail(404, 404, "页面不存在或未发布");
  // 渲染商品/活动块（商品/秒杀/拼团数据分别来自 catalog / marketing 服务）
  const blocks = [];
  for (const b of page.blocks) {
    if (b.type === "goods") {
      const ids = (b.props.productIds || []);
      const batch = await callInternal("catalog", "GET", "/internal/products/batch", null, { ids: ids.join(",") }).catch(() => ({ list: [] }));
      const products = ((batch && batch.list) || []).map((full) => full.product).filter(Boolean);
      blocks.push({ ...b, props: { ...b.props, products } });
      continue;
    }
    if (b.type === "flashsale") {
      const nowT = Date.now();
      const limit = Math.min(Number(b.props.count) || 4, 12);
      const fsList = await callInternal("marketing", "GET", "/internal/flashsales").catch(() => ({ list: [] }));
      const items = [];
      for (const f of (fsList.list || [])) {
        if (f.status !== "active" || new Date(f.startAt) > nowT || new Date(f.endAt) < nowT) continue;
        const prod = await callInternal("catalog", "GET", "/internal/products/" + f.productId).catch(() => null);
        const p = prod ? prod.product : null;
        items.push({
          id: f.id, productId: f.productId, productName: p ? p.name : "", image: p ? p.mainImage : "",
          flashPrice: f.flashPrice, originalPrice: p ? p.price : 0, quota: f.quota, sold: f.sold,
          startAt: f.startAt, endAt: f.endAt, remaining: Math.max(0, f.quota - f.sold),
        });
        if (items.length >= limit) break;
      }
      blocks.push({ ...b, props: { ...b.props, items } });
      continue;
    }
    if (b.type === "groupon") {
      const limit = Math.min(Number(b.props.count) || 4, 12);
      const gpList = await callInternal("marketing", "GET", "/internal/groupons", null, { status: "open" }).catch(() => ({ list: [] }));
      const items = [];
      for (const g of (gpList.list || []).slice(0, limit)) {
        const prod = await callInternal("catalog", "GET", "/internal/products/" + g.productId).catch(() => null);
        const p = prod ? prod.product : null;
        items.push({
          id: g.id, grouponNo: g.grouponNo, productId: g.productId, productName: p ? p.name : "",
          productImage: p ? p.mainImage : "", groupPrice: g.groupPrice, originalPrice: p ? p.price : 0,
          targetSize: g.targetSize, currentSize: g.currentSize,
          status: g.status, statusText: "拼团中", createdAt: g.createdAt, deadline: g.deadline,
        });
      }
      blocks.push({ ...b, props: { ...b.props, items } });
      continue;
    }
    blocks.push(b);
  }
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