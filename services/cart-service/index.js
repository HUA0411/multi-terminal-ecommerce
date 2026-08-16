// 购物车服务（微服务入口）
process.env.SERVICE_NAME = "cart";
process.env.OWNED_COLLECTIONS = "cartItems";
const { boot } = await import("./bootstrap.js");
await boot();
