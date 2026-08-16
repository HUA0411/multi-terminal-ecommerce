// 商品目录服务（微服务入口）
process.env.SERVICE_NAME = "catalog";
process.env.OWNED_COLLECTIONS = "products,productSkus,categories,reviews,favorites,fittingGarments,fittingSessions,translations,currencies";
const { boot } = await import("./bootstrap.js");
await boot();
