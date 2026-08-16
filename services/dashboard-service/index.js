// 数据看板服务：聚合 BFF（无自有数据，全部经内部接口聚合）
process.env.SERVICE_NAME = "dashboard";
process.env.OWNED_COLLECTIONS = "";
const { boot } = await import("./bootstrap.js");
await boot();
