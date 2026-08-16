import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceName = process.env.SERVICE_NAME || "monolith";

// 服务运行模式：monolith=单进程组合（开发/演示）；micro=独立进程微服务（生产形态）
let dataFile = null;
if (process.env.DATA_FILE) {
  const resolved = path.resolve(__dirname, "..", process.env.DATA_FILE);
  dataFile = serviceName === "monolith" ? resolved : resolved + "." + serviceName + ".json";
} else if (serviceName === "monolith") {
  dataFile = path.join(__dirname, "..", "..", "server", "data", "db.json");
} else {
  dataFile = path.join(__dirname, "..", serviceName, "data", serviceName + ".json");
}

export default {
  serviceName,
  port: Number(process.env.PORT || 4000),
  mode: process.env.ECOM_MODE || "monolith",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpires: process.env.JWT_EXPIRES || "7d",
  baseCurrency: process.env.BASE_CURRENCY || "CNY",
  ownedCollections: (process.env.OWNED_COLLECTIONS || "").split(",").map((s) => s.trim()).filter(Boolean),
  dataFile,
  useMySql: (process.env.USE_MYSQL || "false") === "true",
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "ecommerce",
  },
  gatewayUrl: process.env.GATEWAY_URL || "http://127.0.0.1:4000",
  serviceToken: process.env.SERVICE_TOKEN || "dev-internal-token",
  paymentSecrets: {
    wechat: process.env.WECHAT_PAY_KEY || "dev-wechat-secret-key",
    alipay: process.env.ALIPAY_PAY_KEY || "dev-alipay-secret-key",
  },
  orderTimeoutMinutes: Number(process.env.ORDER_TIMEOUT_MINUTES || 15),
  inviteRewardPoints: Number(process.env.INVITE_REWARD_POINTS || 200),
  commissionRate: Number(process.env.COMMISSION_RATE || 0.05),
  sweeperIntervalMs: Number(process.env.SWEEPER_INTERVAL_MS || 30000),
  rateLimits: {
    login: { windowMs: 60000, max: 20 },
    register: { windowMs: 60000, max: 5 },
    seckill: { windowMs: 60000, max: 3 },
    pay: { windowMs: 60000, max: 10 },
    default: { windowMs: 60000, max: 120 },
  },
};
