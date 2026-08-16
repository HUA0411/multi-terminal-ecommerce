import { Router } from "express";
import store from "../../_shared/store.js";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok, fail } from "../../_shared/util.js";

const router = Router();
router.use(auth());

function ser(a) {
  return { id: a.id, name: a.name, phone: a.phone, province: a.province, city: a.city, district: a.district, detail: a.detail, isDefault: !!a.isDefault };
}

router.get("/", asyncHandler(async (req, res) => {
  const list = store.find("addresses", (a) => a.userId === req.user.id).map(ser);
  res.json(ok(list));
}));

router.post("/", asyncHandler(async (req, res) => {
  const { name, phone, province, city, district, detail, isDefault } = req.body || {};
  if (!name || !phone || !detail) return fail(400, 400, "请填写完整的收货信息");
  const def = isDefault !== false && store.count("addresses", (a) => a.userId === req.user.id) === 0;
  const a = store.insert("addresses", { userId: req.user.id, name, phone, province: province || "", city: city || "", district: district || "", detail, isDefault: !!isDefault || def });
  if (a.isDefault) {
    store.find("addresses", (x) => x.userId === req.user.id && x.id !== a.id).forEach((x) => store.update("addresses", x.id, { isDefault: false }));
  }
  res.json(ok(ser(a)));
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const a = store.get("addresses", req.params.id);
  if (!a || a.userId !== req.user.id) return fail(404, 404, "地址不存在");
  const patch = {};
  ["name", "phone", "province", "city", "district", "detail"].forEach((k) => { if (req.body[k] !== undefined) patch[k] = req.body[k]; });
  if (req.body.isDefault) {
    patch.isDefault = true;
    store.find("addresses", (x) => x.userId === req.user.id && x.id !== a.id).forEach((x) => store.update("addresses", x.id, { isDefault: false }));
  }
  res.json(ok(ser(store.update("addresses", a.id, patch))));
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const a = store.get("addresses", req.params.id);
  if (!a || a.userId !== req.user.id) return fail(404, 404, "地址不存在");
  store.remove("addresses", a.id);
  res.json(ok({ removed: true }));
}));

export default router;
