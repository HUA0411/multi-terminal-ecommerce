import { Router } from "express";
import store from "../store.js";
import { auth, rateLimit } from "../middleware.js";
import { asyncHandler, ok, fail, hashPassword, verifyPassword, signToken, signRefresh, verifyToken, publicUser, uid } from "../util.js";

const router = Router();

router.post("/register", rateLimit({ max: 5, name: "register" }), asyncHandler(async (req, res) => {
  const { phone, password, nickname } = req.body || {};
  if (!phone || !/^1\d{10}$/.test(phone)) return fail(400, 400, "手机号格式不正确");
  if (!password || password.length < 6) return fail(400, 400, "密码至少 6 位");
  if (store.findOne("users", (u) => u.phone === phone)) return fail(409, 409, "手机号已注册");
  const user = store.insert("users", {
    phone,
    nickname: nickname || "用户" + phone.slice(-4),
    avatar: "",
    password: hashPassword(password),
    role: "user",
    merchantId: null,
    points: 0,
    status: "active",
  });
  res.json(ok({ token: signToken(user), refreshToken: signRefresh(user), user: publicUser(user) }));
}));

router.post("/login", rateLimit({ max: 20, name: "login" }), asyncHandler(async (req, res) => {
  const { account, password } = req.body || {};
  const user = store.findOne("users", (u) => u.phone === account || u.nickname === account);
  if (!user || !verifyPassword(password || "", user.password)) {
    store.insert("riskEvents", { userId: user ? user.id : null, type: "login_fail", level: "low", detail: { reason: "账号或密码错误" }, ip: req.ip, createdAt: new Date().toISOString() });
    return fail(401, 401, "账号或密码错误");
  }
  if (user.status !== "active") return fail(403, 403, "账号已被禁用");
  res.json(ok({ token: signToken(user), refreshToken: signRefresh(user), user: publicUser(user) }));
}));

// mock 微信登录：任意以 wx 开头的 code 均可换取登录态
router.post("/wechat", asyncHandler(async (req, res) => {
  const { code } = req.body || {};
  if (!code || !String(code).startsWith("wx")) return fail(400, 400, "无效的微信授权 code");
  const phone = "wx" + String(code).slice(0, 12);
  let user = store.findOne("users", (u) => u.phone === phone);
  if (!user) {
    user = store.insert("users", { phone, nickname: "微信用户" + uid(4), avatar: "", password: hashPassword(uid(16)), role: "user", merchantId: null, points: 0, status: "active" });
  }
  res.json(ok({ token: signToken(user), refreshToken: signRefresh(user), user: publicUser(user) }));
}));

router.post("/refresh", asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  try {
    const payload = verifyToken(refreshToken);
    const user = store.get("users", payload.id);
    if (!user) return fail(401, 401, "无效的刷新令牌");
    res.json(ok({ token: signToken(user) }));
  } catch {
    return fail(401, 401, "刷新令牌已过期");
  }
}));

router.get("/me", auth(), asyncHandler(async (req, res) => {
  res.json(ok(publicUser(req.user)));
}));

router.put("/me", auth(), asyncHandler(async (req, res) => {
  const { nickname, avatar } = req.body || {};
  const patch = {};
  if (nickname !== undefined) patch.nickname = String(nickname).slice(0, 30);
  if (avatar !== undefined) patch.avatar = String(avatar).slice(0, 500);
  const user = store.update("users", req.user.id, patch);
  res.json(ok(publicUser(user)));
}));

export default router;
