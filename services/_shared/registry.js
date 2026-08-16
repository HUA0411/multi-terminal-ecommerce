// ============================================================
// 服务注册表：服务名 -> 端口（微服务模式下网关按此路由/编排）
// 端口段：4000 网关 / 401x auth / 402x catalog / 403x cart / 404x trade
//         405x marketing / 406x merchant / 407x content / 408x platform / 409x dashboard
// ============================================================
export const REGISTRY = {
  auth: { port: 4010, name: "用户认证服务" },
  catalog: { port: 4020, name: "商品目录服务" },
  cart: { port: 4030, name: "购物车服务" },
  trade: { port: 4040, name: "交易服务" },
  marketing: { port: 4050, name: "营销服务" },
  merchant: { port: 4060, name: "商家服务" },
  content: { port: 4070, name: "内容服务" },
  platform: { port: 4080, name: "平台服务" },
  dashboard: { port: 4090, name: "数据看板服务" },
  gateway: { port: 4000, name: "API 网关" },
};
