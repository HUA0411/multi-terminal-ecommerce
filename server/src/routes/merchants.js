import { Router } from "express";
import store from "../store.js";
import { auth } from "../middleware.js";
import { asyncHandler, ok, fail, paginate } from "../util.js";
import { serializeProduct, audit } from "./common.js";

const publicRouter = Router();
const adminRouter = Router();
adminRouter.use(auth("admin"));

function ser(m) {
  const products = store.find("products", (p) => p.merchantId === m.id && p.status === "on");
  return { id: m.id, name: m.name, logo: m.logo, description: m.description, contactName: m.contactName, contactPhone: m.contactPhone, rating: m.rating, status: m.status, productCount: products.length, createdAt: m.createdAt };
}

publicRouter.get("/", asyncHandler(async (req, res) => {
  const status = req.query.status || "approved";
  const list = store.find("merchants", (m) => m.status === status).map(ser);
  res.json(ok(paginate(list, req.query.page, req.query.pageSize)));
}));

publicRouter.get("/:id", asyncHandler(async (req, res) => {
  const m = store.get("merchants", req.params.id);
  if (!m || m.status !== "approved") return fail(404, 404, "商家不存在");
  const products = store.find("products", (p) => p.merchantId === m.id && p.status === "on").map((p) => serializeProduct(p, req.query.currency));
  res.json(ok({ ...ser(m), products }));
}));

// 商家入驻申请（user 角色）
publicRouter.post("/apply", auth("user"), asyncHandler(async (req, res) => {
  const { name, contactName, contactPhone, description } = req.body || {};
  if (!name || !contactName || !contactPhone) return fail(400, 400, "请填写完整的入驻信息");
  if (store.findOne("merchants", (m) => m.userId === req.user.id)) return fail(400, 400, "你已提交过入驻申请");
  const m = store.insert("merchants", { userId: req.user.id, name, logo: "", description: description || "", contactName, contactPhone, rating: 0, status: "pending" });
  res.json(ok({ id: m.id, status: "pending" }));
}));

adminRouter.get("/", asyncHandler(async (req, res) => {
  const list = store.all("merchants").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(ser);
  res.json(ok(paginate(list, req.query.page, req.query.pageSize)));
}));

adminRouter.post("/:id/review", asyncHandler(async (req, res) => {
  const m = store.get("merchants", req.params.id);
  if (!m) return fail(404, 404, "商家不存在");
  const approve = !!req.body.approve;
  store.update("merchants", m.id, { status: approve ? "approved" : "rejected" });
  if (approve && m.userId) store.update("users", m.userId, { role: "merchant", merchantId: m.id });
  audit(req, "merchant.review", "merchant:" + m.id, { approve });
  res.json(ok({ id: m.id, status: approve ? "approved" : "rejected" }));
}));

export { publicRouter as merchantRouter, adminRouter as merchantAdminRouter };