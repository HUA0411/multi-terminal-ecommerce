// 交易服务：订单/支付/售后/物流（微服务入口）
process.env.SERVICE_NAME = "trade";
process.env.OWNED_COLLECTIONS = "orders,orderItems,payments,logistics,aftersales";
const { boot } = await import("./bootstrap.js");
await boot();
