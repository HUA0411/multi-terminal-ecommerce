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
  // 支付渠道回调密钥（生产环境从密钥管理服务注入）
  paymentSecrets: {
    wechat: process.env.WECHAT_PAY_KEY || "dev-wechat-secret-key",
    alipay: process.env.ALIPAY_PAY_KEY || "dev-alipay-secret-key",
  },
  // 待付款订单自动取消超时（分钟；测试可设为 0.05 验证）
  orderTimeoutMinutes: Number(process.env.ORDER_TIMEOUT_MINUTES || 15),
  inviteRewardPoints: Number(process.env.INVITE_REWARD_POINTS || 200),
  commissionRate: Number(process.env.COMMISSION_RATE || 0.05),
  sweeperIntervalMs: Number(process.env.SWEEPER_INTERVAL_MS || 30_000),
  rateLimits: {
    login: { windowMs: 60_000, max: 20 },
    register: { windowMs: 60_000, max: 5 },
    seckill: { windowMs: 60_000, max: 3 },
    pay: { windowMs: 60_000, max: 10 },
    default: { windowMs: 60_000, max: 120 }
  }
};