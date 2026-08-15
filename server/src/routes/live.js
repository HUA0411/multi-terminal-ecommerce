import { Router } from "express";
import store from "../store.js";
import { auth } from "../middleware.js";
import { asyncHandler, ok, fail, now } from "../util.js";
import { serializeProduct } from "./common.js";

const router = Router();

function ser(room) {
  const merchant = store.get("merchants", room.merchantId);
  return { id: room.id, title: room.title, cover: room.cover, status: room.status, viewerCount: room.viewerCount, likeCount: room.likeCount, merchantId: room.merchantId, merchantName: merchant ? merchant.name : "", streamUrl: room.streamUrl, startedAt: room.startedAt };
}

router.get("/rooms", asyncHandler(async (req, res) => {
  const status = req.query.status || "live";
  const list = store.find("liveRooms", (r) => r.status === status).map(ser);
  res.json(ok(list));
}));

router.get("/rooms/:id", asyncHandler(async (req, res) => {
  const room = store.get("liveRooms", req.params.id);
  if (!room) return fail(404, 404, "直播间不存在");
  const products = (room.productIds || []).map((id) => store.get("products", id)).filter(Boolean).map((p) => serializeProduct(p, req.query.currency));
  const messages = store.find("liveMessages", (m) => m.roomId === room.id).slice(-50).map((m) => {
    const u = store.get("users", m.userId);
    return { id: m.id, type: m.type, content: m.content, user: u ? { nickname: u.nickname, avatar: u.avatar } : { nickname: "游客", avatar: "" }, createdAt: m.createdAt };
  });
  res.json(ok({ ...ser(room), products, messages }));
}));

// 点赞/分享（REST 兜底，主要互动走 WebSocket）
router.post("/rooms/:id/action", asyncHandler(async (req, res) => {
  const room = store.get("liveRooms", req.params.id);
  if (!room) return fail(404, 404, "直播间不存在");
  const { type } = req.body || {};
  if (type === "like") {
    room.likeCount = (room.likeCount || 0) + 1;
    if (req.app.locals.ws) req.app.locals.ws.publish("live:" + room.id, { type: "live:like", data: { roomId: room.id, count: room.likeCount } });
  }
  res.json(ok({ roomId: room.id, likeCount: room.likeCount }));
}));

// 创建直播间（admin/merchant）
router.post("/admin/rooms", auth("admin", "merchant"), asyncHandler(async (req, res) => {
  const { title, cover, productIds, streamUrl } = req.body || {};
  if (!title) return fail(400, 400, "直播间标题必填");
  const merchantId = req.user.role === "merchant" ? req.user.merchantId : (req.body.merchantId || 1);
  const room = store.insert("liveRooms", { merchantId, title, cover: cover || "", status: "live", viewerCount: 0, likeCount: 0, productIds: productIds || [], streamUrl: streamUrl || "", startedAt: now() });
  res.json(ok(ser(room)));
}));

export default router;
