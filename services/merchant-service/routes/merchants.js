import { Router } from "express";
import store from "../../_shared/store.js";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok, fail, paginate } from "../../_shared/util.js";
import { callInternal } from "../../_shared/internal-client.js";
import { auditLog } from "../../_shared/audit.js";

const publicRouter = Router();
const adminRouter = Router();
adminRouter.use(auth("admin"));

async function ser(m) {
  let productCount = 0;
  try {
    const r = await callInternal("catalog", "GET", "/internal/products/query", null, { merchantId: m.id, status: "on" });
    productCount = (r && r.list) ? r.list.length : 0;
  } catch {}
  return { id: m.id, name: m.name, logo: m.logo, description: m.description, contactName: m.contactName, contactPhone: m.contactPhone, rating: m.rating, status: m.status, productCount, createdAt: m.createdAt };
}

publicRouter.get("/", asyncHandler(async (req, res) => {
  const status = req.query.status || "approved";
  const list = store.find("merchants", (m) => m.status === status);
  const out = [];
  for (const m of list) out.push(await ser(m));
  res.json(ok(paginate(out, req.query.page, req.query.pageSize)));
}));

publicRouter.get("/:id", asyncHandler(async (req, res) => {
  const m = store.get("merchants", req.params.id);
  if (!m || m.status !== "approved") return fail(404, 404, "商家不存在");
  let products = [];
  try {
    const r = await callInternal("catalog", "GET", "/internal/products/query", null, { merchantId: m.id, status: "on" });
    products = (r && r.list) || [];
  } catch {}
  res.json(ok({ ...(await ser(m)), products }));
}));

// 商家入驻申请
publicRouter.post("/apply", auth("user"), asyncHandler(async (req, res) => {
  const { name, contactName, contactPhone, description } = req.body || {};
  if (!name || !contactName || !contactPhone) return fail(400, 400, "请填写完整的入驻信息");
  if (store.findOne("merchants", (m) => m.userId === req.user.id)) return fail(400, 400, "你已提交过入驻申请");
  const m = store.insert("merchants", { userId: req.user.id, name, logo: "", description: description || "", contactName, contactPhone, rating: 0, status: "pending" });
  res.json(ok({ id: m.id, status: "pending" }));
}));

adminRouter.get("/", asyncHandler(async (req, res) => {
  const list = store.all("merchants").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const out = [];
  for (const m of list) out.push(await ser(m));
  res.json(ok(paginate(out, req.query.page, req.query.pageSize)));
}));

adminRouter.post("/:id/review", asyncHandler(async (req, res) => {
  const m = store.get("merchants", req.params.id);
  if (!m) return fail(404, 404, "商家不存在");
  const approve = !!req.body.approve;
  store.update("merchants", m.id, { status: approve ? "approved" : "rejected" });
  if (approve && m.userId) {
    // 提升用户为商家角色（auth 服务）
    await callInternal("auth", "PUT", "/internal/users/" + m.userId + "/role", { role: "merchant", merchantId: m.id }).catch(() => {});
  }
  auditLog(req.user, "merchant.review", "merchant:" + m.id, { approve }, req.ip);
  res.json(ok({ id: m.id, status: approve ? "approved" : "rejected" }));
}));

export { publicRouter as merchantRouter, adminRouter as merchantAdminRouter };
