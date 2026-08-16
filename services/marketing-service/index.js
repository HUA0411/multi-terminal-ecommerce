// 营销服务：优惠券/秒杀/分享/积分/拼团（微服务入口）
process.env.SERVICE_NAME = "marketing";
process.env.OWNED_COLLECTIONS = "coupons,userCoupons,flashSales,shares,pointsLogs,pointsProducts,redemptions,groupons";
const { boot } = await import("./bootstrap.js");
await boot();
