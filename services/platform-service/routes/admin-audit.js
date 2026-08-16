import { Router } from "express";
import store from "../../_shared/store.js";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok, paginate } from "../../_shared/util.js";

const router = Router();
router.use(auth("admin"));

router.get("/audit-logs", asyncHandler(async (req, res) => {
  const list = store.all("auditLogs").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(ok(paginate(list, req.query.page, req.query.pageSize)));
}));

export default router;
