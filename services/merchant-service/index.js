// 商家服务：商家入驻/审核/询价 RFQ/B2B 客户（微服务入口）
process.env.SERVICE_NAME = "merchant";
process.env.OWNED_COLLECTIONS = "merchants,quotes";
const { boot } = await import("./bootstrap.js");
await boot();
