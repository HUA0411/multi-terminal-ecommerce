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
  // 渲染商品块
  const blocks = page.blocks.map((b) => {
    if (b.type === "goods") {
      const ids = (b.props.productIds || []);
      const products = ids.map((id) => store.get("products", id)).filter(Boolean).map((p) => serializeProduct(p, req.query.currency));
      return { ...b, props: { ...b.props, products } };
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

adminRouter.post("/pages/:id/publish", asyncHandler(async (req, res) => {
  const page = store.get("cmsPages", req.params.id);
  if (!page) return fail(404, 404, "页面不存在");
  store.update("cmsPages", page.id, { status: "published", updatedBy: req.user.id, updatedAt: now() });
  res.json(ok(store.get("cmsPages", page.id)));
}));

export { publicRouter as cmsPublicRouter, adminRouter as cmsAdminRouter };
