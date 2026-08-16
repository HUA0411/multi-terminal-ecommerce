import { Router } from "express";
import store from "../../_shared/store.js";
import { internalHandler } from "../../_shared/app-factory.js";
import { cartSummary, ensureSku } from "./common.js";

const router = Router();

// 用户购物车汇总（下单链路读取；currency 换算由调用方处理）
router.get("/cart/:userId", internalHandler(async ({ params, query }) => {
  const uid = Number(params.userId);
  const ids = store.find("cartItems", (c) => c.userId === uid).map((c) => c.skuId);
  await Promise.all(ids.map((id) => ensureSku(id)));
  return cartSummary(uid, query.currency, query.user ? JSON.parse(query.user) : null);
}));

// 删除购物车项（下单成功后清理）
router.post("/cart/:userId/remove", internalHandler(({ params, body }) => {
  const uid = Number(params.userId);
  const ids = (body && body.ids) || [];
  const n = store.removeWhere("cartItems", (c) => c.userId === uid && ids.map(Number).includes(Number(c.id)));
  return { removed: n };
}));

export default router;
