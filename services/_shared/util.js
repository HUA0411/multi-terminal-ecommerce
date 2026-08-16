import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "./config.js";

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const ok = (data = null, message = "ok") => ({ code: 0, data, message });
export const fail = (status, code, message) => { throw new ApiError(status, code, message); };

export const now = () => new Date().toISOString();
export const today = () => new Date().toISOString().slice(0, 10);

export const uid = (len = 8) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  const rnd = new Uint8Array(len);
  const c = typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(rnd) : rnd;
  for (let i = 0; i < len; i++) s += chars[c[i] % chars.length];
  return s;
};

export const orderNo = () => new Date().toISOString().replace(/\D/g, "").slice(0, 14) + uid(6);

export const hashPassword = (pwd) => bcrypt.hashSync(pwd, 8);
export const verifyPassword = (pwd, hash) => bcrypt.compareSync(pwd, hash);

export const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, merchantId: user.merchantId || null, nickname: user.nickname || "", customerType: user.customerType || "retail" }, config.jwtSecret, {
    expiresIn: config.jwtExpires,
  });
export const signRefresh = (user) =>
  jwt.sign({ id: user.id, typ: "refresh" }, config.jwtSecret, { expiresIn: "30d" });
export const verifyToken = (token) => jwt.verify(token, config.jwtSecret);

// 脱敏用户对象
export const publicUser = (u) => ({
  id: u.id,
  nickname: u.nickname,
  avatar: u.avatar,
  phone: u.phone,
  role: u.role,
  points: u.points || 0,
  merchantId: u.merchantId || null,
  customerType: u.customerType || "retail",
  status: u.status,
  createdAt: u.createdAt,
});

export const paginate = (list, page = 1, pageSize = 20) => {
  page = Math.max(1, Number(page) || 1);
  pageSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const start = (page - 1) * pageSize;
  return { list: list.slice(start, start + pageSize), total: list.length, page, pageSize };
};

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const money = {
  // 金额单位为分；str/num 均可
  toCents: (v) => Math.round(Number(v || 0) * 100),
  format: (cents, currency = "CNY") => ({ amount: Math.round(cents), currency }),
};