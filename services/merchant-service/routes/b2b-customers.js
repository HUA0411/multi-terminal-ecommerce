import { Router } from "express";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok } from "../../_shared/util.js";
import { callInternal } from "../../_shared/internal-client.js";

const router = Router();
router.use(auth("admin", "merchant"));

// B2B 客户管理：批发客户及其采购情况（auth 用户 + trade 订单聚合）
router.get("/b2b-customers", asyncHandler(async (req, res) => {
  const users = await callInternal("auth", "GET", "/internal/users/query", null, { customerType: "wholesale" }).catch(() => ({ list: [] }));
  const rows = [];
  for (const u of (users.list || [])) {
    const params = { userId: u.id };
    if (req.user.role === "merchant") params.merchantId = req.user.merchantId;
    const orders = await callInternal("trade", "GET", "/internal/orders/query", null, params).catch(() => ({ list: [] }));
    const mine = (orders.list || []);
    const paid = mine.filter((o) => ["paid", "shipped", "completed", "refunding"].includes(o.status));
    if (!paid.length) continue;
    rows.push({
      userId: u.id, nickname: u.nickname, phone: u.phone,
      orderCount: paid.length,
      gmv: paid.reduce((s, o) => s + o.payableAmount, 0),
      lastOrderAt: mine.length ? mine[mine.length - 1].createdAt : null,
    });
  }
  rows.sort((a, b) => b.gmv - a.gmv);
  res.json(ok({ total: rows.length, list: rows }));
}));

export default router;
