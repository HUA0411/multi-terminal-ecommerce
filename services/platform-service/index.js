// 平台服务：通知 / 风控 / 审计（微服务入口）
process.env.SERVICE_NAME = "platform";
process.env.OWNED_COLLECTIONS = "notifications,riskEvents,riskRules,auditLogs";
const { boot } = await import("./bootstrap.js");
await boot();
