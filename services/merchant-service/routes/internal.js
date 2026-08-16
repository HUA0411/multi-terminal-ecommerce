import { Router } from "express";
import store from "../../_shared/store.js";
import { internalHandler } from "../../_shared/app-factory.js";

const router = Router();

router.get("/merchants/:id", internalHandler(({ params }) => {
  return store.get("merchants", params.id) || null;
}));

router.get("/merchants", internalHandler(({ query }) => {
  let list = store.all("merchants");
  if (query.status) list = list.filter((m) => m.status === query.status);
  return { list };
}));

export default router;
