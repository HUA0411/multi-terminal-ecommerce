import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpires: process.env.JWT_EXPIRES || "7d",
  baseCurrency: process.env.BASE_CURRENCY || "CNY",
  dataFile: process.env.DATA_FILE
    ? path.resolve(__dirname, "..", process.env.DATA_FILE)
    : path.join(__dirname, "..", "data", "db.json"),
  useMySql: (process.env.USE_MYSQL || "false") === "true",
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  // 简易频控默认值（生产可替换为 Redis 滑动窗口）
  rateLimits: {
    login: { windowMs: 60_000, max: 20 },
    register: { windowMs: 60_000, max: 5 },
    seckill: { windowMs: 60_000, max: 3 },
    pay: { windowMs: 60_000, max: 10 },
    default: { windowMs: 60_000, max: 120 }
  }
};
