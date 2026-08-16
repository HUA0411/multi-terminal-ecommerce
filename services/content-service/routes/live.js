import { Router } from "express";
import store from "../../_shared/store.js";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok, fail, now } from "../../_shared/util.js";
import { callInternal } from "../../_shared/internal-client.js";
import { publish } from "../../_shared/publisher.js";

const router = Router();

async function ser(room) {
  let merchantName = "";
  try {
    const m = await callInternal("merchant", "GET", "/internal/merchants/" + room.merchantId);
    if (m) merchantName = m.name || "";
  } catch {}
  return { id: room.id, title: room.title, cover: room.cover, status: room.status, viewerCount: room.viewerCount, likeCount: room.likeCount, merchantId: room.merchantId, merchantName, streamUrl: room.streamUrl, startedAt: room.startedAt };
}

router.get("/rooms", asyncHandler(async (req, res) => {
  const status = req.query.status || "live";
  const list = store.find("liveRooms", (r) => r.status === status);
  const out = [];
  for (const r of list) out.push(await ser(r));
  res.json(ok(out));
}));

router.get("/rooms/:id", asyncHandler(async (req, res) => {
  const room = store.get("liveRooms", req.params.id);
  if (!room) return fail(404, 404, "直播间不存在");
  let products = [];
  try {
    const batch = await callInternal("catalog", "GET", "/internal/products/batch", null, { ids: (room.productIds || []).join(",") });
    products = ((batch && batch.list) || []).map((full) => full.product).filter(Boolean);
  } catch {}
  const messages = store.find("liveMessages", (m) => m.roomId === room.id).slice(-50);
  const out = [];
  for (const m of messages) {
    let nickname = "游客", avatar = "";
    try {
      const u = await callInternal("auth", "GET", "/internal/users/" + m.userId);
      if (u) { nickname = u.nickname || "游客"; avatar = u.avatar || ""; }
    } catch {}
    out.push({ id: m.id, type: m.type, content: m.content, user: { nickname, avatar }, createdAt: m.createdAt });
  }
  res.json(ok({ ...(await ser(room)), products, messages: out }));
}));

// 点赞/分享（REST 兜底；主要互动走 WebSocket -> 网关 -> 本服务）
router.post("/rooms/:id/action", asyncHandler(async (req, res) => {
  const room = store.get("liveRooms", req.params.id);
  if (!room) return fail(404, 404, "直播间不存在");
  const { type } = req.body || {};
  if (type === "like") {
    room.likeCount = (room.likeCount || 0) + 1;
    await publish("live:" + room.id, { type: "live:like", data: { roomId: room.id, count: room.likeCount } });
  }
  res.json(ok({ roomId: room.id, likeCount: room.likeCount }));
}));

// 创建直播间（admin/merchant）
router.post("/admin/rooms", auth("admin", "merchant"), asyncHandler(async (req, res) => {
  const { title, cover, productIds, streamUrl } = req.body || {};
  if (!title) return fail(400, 400, "直播间标题必填");
  const merchantId = req.user.role === "merchant" ? req.user.merchantId : (req.body.merchantId || 1);
  const room = store.insert("liveRooms", { merchantId, title, cover: cover || "", status: "live", viewerCount: 0, likeCount: 0, productIds: productIds || [], streamUrl: streamUrl || "", startedAt: now() });
  res.json(ok(await ser(room)));
}));

export default router;
