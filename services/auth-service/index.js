// 用户认证服务（微服务入口）
process.env.SERVICE_NAME = "auth";
process.env.OWNED_COLLECTIONS = "users,addresses";
const { boot } = await import("./bootstrap.js");
await boot();
