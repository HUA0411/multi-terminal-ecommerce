import { Router } from "express";
import store from "../../_shared/store.js";
import { internalHandler } from "../../_shared/app-factory.js";
import { ApiError } from "../../_shared/util.js";

const router = Router();

// 直播弹幕（网关 WebSocket 转发）：落库并返回待推送事件
router.post("/live/chat", internalHandler(({ body }) => {
  const roomId = Number(body && body.roomId);
  const room = store.get("liveRooms", roomId);
  if (!room) throw new ApiError(404, 404, "直播间不存在");
  const content = String((body && body.content) || "").slice(0, 200);
  const user = (body && body.user) || { id: 0, nickname: "游客", avatar: "" };
  if (content) {
    store.insert("liveMessages", { roomId, userId: user.id || 0, type: "chat", content, createdAt: new Date().toISOString() });
  }
  return { type: "live:chat", data: { roomId, user, content } };
}));

// 直播点赞（网关 WebSocket 转发）
router.post("/live/like", internalHandler(({ body }) => {
  const roomId = Number(body && body.roomId);
  const room = store.get("liveRooms", roomId);
  if (!room) throw new ApiError(404, 404, "直播间不存在");
  room.likeCount = (room.likeCount || 0) + 1;
  return { type: "live:like", data: { roomId, count: room.likeCount } };
}));

export default router;
