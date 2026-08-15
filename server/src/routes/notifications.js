import { Router } from "express";
import store from "../store.js";
import { auth } from "../middleware.js";
import { asyncHandler, ok, paginate, now } from "../util.js";

const router = Router();
router.use(auth());

router.get("/", asyncHandler(async (req, res) => {
  const list = store.find("notifications", (n) => n.userId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(ok(paginate(list, req.query.page, req.query.pageSize)));
}));

router.get("/unread-count", asyncHandler(async (req, res) => {
  const n = store.count("notifications", (x) => x.userId === req.user.id && !x.read);
  res.json(ok({ unread: n }));
}));

router.put("/:id/read", asyncHandler(async (req, res) => {
  const n = store.get("notifications", req.params.id);
  if (!n || n.userId !== req.user.id) return ok({ id: req.params.id, read: true });
  const updated = store.update("notifications", n.id, { read: true, readAt: now() });
  res.json(ok(updated));
}));

router.put("/read-all", asyncHandler(async (req, res) => {
  store.find("notifications", (n) => n.userId === req.user.id && !n.read).forEach((n) => store.update("notifications", n.id, { read: true, readAt: now() }));
  res.json(ok({ readAll: true }));
}));

export default router;