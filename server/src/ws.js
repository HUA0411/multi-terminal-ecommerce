import { WebSocketServer } from "ws";
import { verifyToken } from "./util.js";
import store from "./store.js";

// ============================================================
// WebSocket 实时中枢
// - 认证：ws://host/ws?token=<JWT>
// - 订阅：{type:"subscribe", rooms:["cart","notify","live:1","flashsale"]}
// - 服务端事件：cart:changed / notify / live:chat / live:like / live:product / flashsale:started
// ============================================================

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, "http://localhost");
    const token = url.searchParams.get("token");
    let user = null;
    if (token) {
      try {
        const payload = verifyToken(token);
        user = store.get("users", payload.id);
      } catch { /* 匿名连接也允许，用于直播观看 */ }
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = user;
      ws.rooms = new Set();
      // 自动加入个人房间
      if (user) {
        ws.rooms.add("cart:" + user.id);
        ws.rooms.add("notify:" + user.id);
      }
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    const who = ws.user ? ws.user.nickname + "(#" + ws.user.id + ")" : "anonymous";
    console.log(`[ws] connected ${who}, rooms=${[...ws.rooms].join(",")}`);

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      switch (msg.type) {
        case "subscribe":
          (msg.rooms || []).forEach((r) => {
            if (r === "cart") ws.rooms.add("cart:" + (ws.user ? ws.user.id : "guest"));
            else if (r === "notify") ws.rooms.add("notify:" + (ws.user ? ws.user.id : "guest"));
            else ws.rooms.add(String(r));
          });
          break;
        case "unsubscribe":
          (msg.rooms || []).forEach((r) => ws.rooms.delete(String(r)));
          break;
        // ---- 直播互动 ----
        case "live:chat": {
          const content = String(msg.content || "").slice(0, 200);
          if (!content) break;
          const roomId = Number(msg.roomId);
          const room = store.get("liveRooms", roomId);
          if (!room) break;
          store.insert("liveMessages", { roomId, userId: ws.user ? ws.user.id : 0, type: "chat", content, createdAt: new Date().toISOString() });
          publish("live:" + roomId, { type: "live:chat", data: { roomId, user: ws.user ? { id: ws.user.id, nickname: ws.user.nickname, avatar: ws.user.avatar } : { id: 0, nickname: "游客" }, content } });
          break;
        }
        case "live:like": {
          const roomId = Number(msg.roomId);
          const room = store.get("liveRooms", roomId);
          if (!room) break;
          room.likeCount = (room.likeCount || 0) + 1;
          publish("live:" + roomId, { type: "live:like", data: { roomId, count: room.likeCount } });
          break;
        }
        case "live:product": {
          const roomId = Number(msg.roomId);
          publish("live:" + roomId, { type: "live:product", data: { roomId, productId: msg.productId } });
          break;
        }
        case "ping":
          ws.send(JSON.stringify({ type: "pong" }));
          break;
      }
    });

    ws.on("close", () => {
      console.log(`[ws] disconnected ${who}`);
    });
  });

  function publish(room, event) {
    const payload = JSON.stringify(event);
    let sent = 0;
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN && client.rooms.has(room)) {
        client.send(payload);
        sent++;
      }
    });
    if (sent) console.log(`[ws] -> ${room} x${sent} ${event.type}`);
  }

  // 供路由层使用
  const api = {
    publish,
    publishToUser(userId, event) {
      publish("cart:" + userId, event);
      publish("notify:" + userId, event);
    },
    broadcast(event) {
      const payload = JSON.stringify(event);
      wss.clients.forEach((c) => {
        if (c.readyState === c.OPEN) c.send(payload);
      });
    },
  };

  return api;
}
