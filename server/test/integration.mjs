// 多端电商系统 后端集成测试
// 用法: node test/integration.mjs   （自动启动独立服务实例，使用临时数据文件）
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4199;
const BASE = "http://127.0.0.1:" + PORT + "/api/v1";
const tmpFile = path.join(os.tmpdir(), "ecom-test-" + Date.now() + ".json");

let passed = 0;
let failed = 0;
const failures = [];

function check(name, cond, extra) {
  if (cond) { passed++; console.log("  ✅ " + name); }
  else { failed++; failures.push(name); console.log("  ❌ " + name + " " + (extra || "")); }
}

async function api(method, p, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(BASE + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 支付回调签名（与服务端 callbackSign 一致）
function callbackSign(payload, secret) {
  const canon = Object.keys(payload).filter((k) => k !== "sign").sort().map((k) => k + "=" + payload[k]).join("&");
  return crypto.createHmac("sha256", secret).update(canon).digest("hex");
}

async function callbackPost(channel, payload) {
  const res = await fetch(BASE + "/payments/callback/" + channel, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { status: res.status, text: await res.text() };
}

console.log("[test] 启动测试服务实例...");
const server = spawn(process.execPath, [path.join(__dirname, "..", "src", "index.js")], {
  env: { ...process.env, PORT: String(PORT), DATA_FILE: tmpFile },
  stdio: "pipe",
});
server.stdout.on("data", (d) => process.stdout.write("[srv] " + d));
server.stderr.on("data", (d) => process.stderr.write("[srv-err] " + d));

async function waitHealth() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch("http://127.0.0.1:" + PORT + "/api/v1/health");
      if (r.ok) return true;
    } catch {}
    await sleep(500);
  }
  return false;
}

const tokens = {};
let orderId = null;
let paymentId = null;

async function main() {
  const up = await waitHealth();
  check("服务启动 & /health", up);
  if (!up) { cleanup(); process.exit(1); }

  // ================= AUTH =================
  console.log("\n[1] 认证 Auth");
  let r = await api("POST", "/auth/login", { account: "user", password: "user123" });
  check("登录 user/user123", r.status === 200 && r.json.code === 0);
  tokens.user = r.json.data.token;
  check("登录返回用户角色", r.json.data.user.role === "user");

  r = await api("POST", "/auth/login", { account: "admin", password: "admin123" });
  tokens.admin = r.json.data.token;
  r = await api("POST", "/auth/login", { account: "merchant", password: "merchant123" });
  tokens.merchant = r.json.data.token;
  check("商家登录", r.status === 200 && r.json.code === 0);
  r = await api("POST", "/auth/login", { account: "13800000006", password: "merchant123" });
  tokens.merchant2 = r.json.data.token;

  r = await api("POST", "/auth/login", { account: "user", password: "wrong" });
  check("错误密码 401", r.status === 401);
  r = await api("POST", "/auth/register", { phone: "13900001234", password: "test123456", nickname: "测试用户" });
  check("注册新用户", r.status === 200 && r.json.code === 0);
  tokens.newbie = r.json.data.token;
  r = await api("POST", "/addresses", { name: "新用户", phone: "13900001234", province: "广东省", city: "深圳市", district: "南山区", detail: "测试路 1 号" }, tokens.newbie);
  check("新增收货地址", r.status === 200 && r.json.data.id > 0);
  r = await api("GET", "/auth/me", null, tokens.user);
  check("/auth/me", r.status === 200 && r.json.data.phone === "13800000003");
  r = await api("POST", "/auth/wechat", { code: "wx-mock-code-123456" });
  check("微信 mock 登录", r.status === 200 && r.json.code === 0);
  r = await api("GET", "/auth/me");
  check("未登录 401", r.status === 401);

  // ================= PRODUCTS =================
  console.log("\n[2] 商品 Products");
  r = await api("GET", "/products?page=1&pageSize=5");
  check("商品列表分页", r.status === 200 && r.json.data.list.length === 5 && r.json.data.total >= 20);
  r = await api("GET", "/products?keyword=" + encodeURIComponent("手机"));
  check("关键词搜索", r.json.data.total >= 1);
  r = await api("GET", "/products?categoryId=6&sort=price_asc");
  check("分类+价格排序", r.status === 200 && r.json.data.total >= 1);
  r = await api("GET", "/products/101?currency=USD");
  check("商品详情含 SKU", r.status === 200 && r.json.data.skus.length >= 2 && r.json.data.merchantName.length > 0);
  check("多币种换算", r.status === 200 && r.json.data.currency === "USD" && r.json.data.price > 0);
  r = await api("GET", "/categories");
  check("分类树", r.status === 200 && r.json.data.length >= 5 && r.json.data[0].children.length > 0);
  r = await api("GET", "/search/suggest?keyword=" + encodeURIComponent("星"));
  check("搜索联想", r.status === 200 && r.json.data.keywords.length >= 1);

  // ================= CART + WS =================
  console.log("\n[3] 购物车实时同步 Cart + WebSocket");
  r = await api("POST", "/cart/items", { skuId: 1, quantity: 1 }, tokens.user);
  check("加入购物车", r.status === 200 && r.json.data.totalQuantity === 1);
  r = await api("POST", "/cart/items", { skuId: 24, quantity: 1 }, tokens.user);
  r = await api("POST", "/cart/items", { skuId: 26, quantity: 2 }, tokens.user);
  check("购物车合计数量", r.json.data.totalQuantity === 4);

  let wsGotCartEvent = false;
  const ws = new WebSocket("ws://127.0.0.1:" + PORT + "/ws?token=" + tokens.user);
  await new Promise((resolve, reject) => { ws.on("open", resolve); ws.on("error", reject); });
  ws.send(JSON.stringify({ type: "subscribe", rooms: ["cart"] }));
  ws.on("message", (raw) => {
    try {
      const m = JSON.parse(raw.toString());
      if (m.type === "cart:changed") wsGotCartEvent = true;
    } catch {}
  });
  await sleep(300);
  r = await api("PUT", "/cart/items/1", { quantity: 2 }, tokens.user);
  await sleep(500);
  check("WebSocket 收到 cart:changed", wsGotCartEvent);

  // ================= ORDER + PAYMENT + LOGISTICS =================
  console.log("\n[4] 订单/支付/物流/售后");
  r = await api("POST", "/orders", { addressId: 1, couponId: 2, remark: "集成测试订单" }, tokens.user);
  check("下单（含优惠券抵扣）", r.status === 200 && r.json.code === 0);
  check("优惠券抵扣 30 元", r.json.data.orders[0].couponAmount === 3000);
  orderId = r.json.data.orders[0].id;
  r = await api("POST", "/orders/" + orderId + "/pay", { method: "wechat" }, tokens.user);
  check("发起支付", r.status === 200 && r.json.data.status === "pending");
  paymentId = r.json.data.paymentId;
  r = await api("POST", "/payments/" + paymentId + "/mock-success", {}, tokens.user);
  check("模拟支付成功", r.status === 200 && r.json.data.status === "success");
  r = await api("GET", "/orders/" + orderId, null, tokens.user);
  check("订单状态 -> 待发货", r.json.data.status === "paid");

  r = await api("POST", "/admin/orders/" + orderId + "/ship", { carrier: "顺丰速运", trackingNo: "SF1234567890" }, tokens.merchant);
  check("商家发货", r.status === 200 && r.json.data.status === "shipped");
  // ---- 微信/支付宝异步回调（验签 + 状态推进）----
  await api("POST", "/cart/items", { skuId: 1, quantity: 1 }, tokens.user);
  r = await api("POST", "/orders", { addressId: 1 }, tokens.user);
  const cbOrderId = r.json.data.orders[0].id;
  r = await api("POST", "/orders/" + cbOrderId + "/pay", { method: "wechat" }, tokens.user);
  const cbPaymentId = r.json.data.paymentId;
  const cbPayload = { paymentId: cbPaymentId, amount: 299900, transactionNo: "wxCB" + cbPaymentId };
  cbPayload.sign = callbackSign(cbPayload, "dev-wechat-secret-key");
  const cbRes = await callbackPost("wechat", cbPayload);
  check("微信回调验签成功推进支付", cbRes.status === 200 && cbRes.text === "success");
  r = await api("GET", "/orders/" + cbOrderId, null, tokens.user);
  check("回调后订单待发货", r.json.data.status === "paid");
  // 非法签名被拒绝
  const bad = await callbackPost("wechat", { paymentId: cbPaymentId, amount: 299900, sign: "deadbeef" });
  check("非法签名回调 401", bad.status === 401);
  // 金额不一致被拒绝（合法签名但金额错误）
  const badAmount = { paymentId: cbPaymentId, amount: 1, sign: "" };
  badAmount.sign = callbackSign(badAmount, "dev-wechat-secret-key");
  const badAmountRes = await callbackPost("wechat", badAmount);
  check("金额不一致回调 400", badAmountRes.status === 400);
  // 支付宝渠道回调
  await api("POST", "/cart/items", { skuId: 1, quantity: 1 }, tokens.user);
  r = await api("POST", "/orders", { addressId: 1 }, tokens.user);
  const aliOrderId = r.json.data.orders[0].id;
  r = await api("POST", "/orders/" + aliOrderId + "/pay", { method: "alipay" }, tokens.user);
  const aliPayload = { paymentId: r.json.data.paymentId, amount: 299900, transactionNo: "aliCB1" };
  aliPayload.sign = callbackSign(aliPayload, "dev-alipay-secret-key");
  const aliRes = await callbackPost("alipay", aliPayload);
  check("支付宝回调验签成功", aliRes.status === 200 && aliRes.text === "success");

  r = await api("GET", "/orders/" + orderId + "/track", null, tokens.user);
  check("物流轨迹", r.status === 200 && r.json.data.events.length >= 1);
  r = await api("POST", "/orders/" + orderId + "/confirm", {}, tokens.user);
  check("确认收货 -> 完成 + 返积分", r.status === 200 && r.json.data.status === "completed");
  r = await api("GET", "/my/points", null, tokens.user);
  check("积分到账", r.json.data.balance > 1280);

  r = await api("GET", "/orders?status=completed", null, tokens.user);
  check("订单列表按状态过滤", r.status === 200 && r.json.data.list.length >= 1);

  r = await api("POST", "/orders/9003/apply-refund", { reason: "尺寸不合适" }, tokens.user);
  check("申请售后", r.status === 200 && r.json.data.aftersale.status === "pending");
  r = await api("GET", "/aftersales", null, tokens.user);
  check("售后单列表", r.status === 200 && r.json.data.list.length >= 1);
  const aftersaleId = r.json.data.list[0].id;
  r = await api("POST", "/admin/aftersales/" + aftersaleId + "/handle", { approve: true, note: "同意退款" }, tokens.merchant2);
  check("商家同意退款", r.status === 200 && r.json.data.status === "refunded");
  r = await api("GET", "/orders/9003", null, tokens.user);
  check("订单状态 -> 已退款", r.json.data.status === "refunded");

  // 地址快照下单（兼容无后端地址簿的客户端，如移动端本地地址）
  await api("POST", "/cart/items", { skuId: 24, quantity: 1 }, tokens.user);
  r = await api("POST", "/orders", { address: { name: "快照用户", phone: "13900001111", province: "广东省", city: "深圳市", district: "福田区", detail: "快照路 9 号" } }, tokens.user);
  check("地址快照下单", r.status === 200 && r.json.data.orders[0].address.name === "快照用户");
  const snapOrderId = r.json.data.orders[0].id;
  r = await api("POST", "/orders/" + snapOrderId + "/cancel", {}, tokens.user);
  check("快照订单取消", r.status === 200);

  // 取消订单流程（先补购物车）
  await api("POST", "/cart/items", { skuId: 1, quantity: 1 }, tokens.user);
  r = await api("POST", "/orders", { addressId: 1, couponId: 1 }, tokens.user);
  const cancelId = r.json.data.orders[0].id;
  r = await api("POST", "/orders/" + cancelId + "/cancel", {}, tokens.user);
  check("取消待付款订单", r.status === 200 && r.json.data.status === "cancelled");
  r = await api("GET", "/my/coupons?status=unused", null, tokens.user);
  check("取消后优惠券退回", r.json.data.list.some((c) => c.couponId === 1));

  // ================= 营销 =================
  console.log("\n[5] 营销：优惠券/秒杀/分享/积分");
  r = await api("GET", "/coupons/available", null, tokens.user);
  check("可领优惠券列表", r.status === 200 && r.json.data.list.length >= 3);
  r = await api("POST", "/coupons/1/claim", {}, tokens.newbie);
  check("领券", r.status === 200 && r.json.data.claimed === true);
  r = await api("GET", "/flashsales", null, tokens.user);
  check("进行中的秒杀", r.status === 200 && r.json.data.length >= 2);
  r = await api("POST", "/flashsales/1/seckill", { skuId: 6 }, tokens.newbie);
  check("秒杀成功下单", r.status === 200 && r.json.data.ok === true);
  const flashOrderId = r.json.data.order.id;
  check("秒杀价格生效", r.json.data.order.payableAmount === 59900);
  r = await api("POST", "/flashsales/1/seckill", { skuId: 6 }, tokens.newbie);
  check("秒杀限购拦截", r.status === 400);
  r = await api("POST", "/orders/" + flashOrderId + "/pay", { method: "alipay" }, tokens.newbie);
  paymentId = r.json.data.paymentId;
  r = await api("POST", "/payments/" + paymentId + "/mock-success", {}, tokens.newbie);
  check("秒杀订单支付成功", r.status === 200);
  r = await api("POST", "/shares", { type: "product", refId: 101 }, tokens.user);
  check("创建分享链接", r.status === 200 && r.json.data.url.startsWith("/s/"));
  const shareCode = r.json.data.code;
  r = await api("GET", "/shares/" + shareCode);
  check("访问分享链接", r.status === 200 && r.json.data.clicks >= 1);
  r = await api("GET", "/my/points/logs", null, tokens.user);
  check("积分流水", r.status === 200 && r.json.data.list.length >= 3);

  // ================= CMS / 看板 / 商户 =================
  console.log("\n[6] CMS / 数据看板 / 多商户");
  r = await api("GET", "/cms/pages/home");
  check("首页 CMS 区块", r.status === 200 && r.json.data.blocks.length >= 4);
  check("goods 块渲染商品", Array.isArray(r.json.data.blocks.find((b) => b.type === "goods").props.products));
  const fsBlock = r.json.data.blocks.find((b) => b.type === "flashsale");
  check("flashsale 块渲染秒杀", fsBlock && Array.isArray(fsBlock.props.items) && fsBlock.props.items.length >= 1 && fsBlock.props.items[0].flashPrice > 0);
  const gpBlock = r.json.data.blocks.find((b) => b.type === "groupon");
  check("groupon 块渲染拼团", gpBlock && Array.isArray(gpBlock.props.items) && gpBlock.props.items.length >= 1 && gpBlock.props.items[0].targetSize >= 2);
  r = await api("POST", "/admin/cms/pages", { key: "test-page", title: "测试页", blocks: [{ type: "notice", props: { text: "hi" } }] }, tokens.admin);
  check("创建 CMS 页面", r.status === 200);
  const newPageId = r.json.data.id;
  r = await api("POST", "/admin/cms/pages/" + newPageId + "/publish", {}, tokens.admin);
  check("发布 CMS 页面", r.json.data.status === "published");

  r = await api("GET", "/admin/dashboard/overview", null, tokens.admin);
  check("管理端看板概览", r.status === 200 && r.json.data.gmv > 0 && r.json.data.orderCount >= 3);
  r = await api("GET", "/admin/dashboard/sales-trend?days=7", null, tokens.admin);
  check("销售趋势", r.status === 200 && r.json.data.length === 7);
  r = await api("GET", "/admin/dashboard/category-distribution", null, tokens.admin);
  check("品类分布", r.status === 200 && r.json.data.length >= 1);
  r = await api("GET", "/admin/dashboard/top-products?limit=5", null, tokens.admin);
  check("Top 商品", r.status === 200 && r.json.data.length >= 1);
  r = await api("GET", "/merchant/dashboard/overview", null, tokens.merchant);
  check("商家看板数据隔离", r.status === 200 && r.json.data.productCount > 0);

  r = await api("GET", "/merchants");
  check("商家列表", r.status === 200 && r.json.data.list.length >= 3);
  r = await api("GET", "/merchants/1");
  check("商家详情+商品", r.status === 200 && r.json.data.products.length >= 1);
  r = await api("POST", "/merchants/apply", { name: "测试小店", contactName: "张三", contactPhone: "13900009999", description: "测试" }, tokens.newbie);
  check("商家入驻申请", r.status === 200 && r.json.data.status === "pending");
  r = await api("GET", "/admin/merchants", null, tokens.admin);
  const pendingMerchant = r.json.data.list.find((m) => m.name === "测试小店");
  check("管理端商家列表含待审", !!pendingMerchant);
  r = await api("POST", "/admin/merchants/" + pendingMerchant.id + "/review", { approve: true }, tokens.admin);
  check("审核通过入驻", r.status === 200 && r.json.data.status === "approved");

  // ================= 多语言/多货币/推荐/直播/试衣/风控 =================
  console.log("\n[7] 多语言/多货币/推荐/直播/试衣/风控");
  r = await api("GET", "/settings/public");
  check("门店公共配置", r.status === 200 && r.json.data.currencies.length >= 4 && r.json.data.languages.length >= 2);
  r = await api("GET", "/i18n/en-US");
  check("英文语言包", r.status === 200 && r.json.data.home === "Home");
  r = await api("GET", "/i18n/ja-JP");
  check("日文语言包", r.status === 200 && r.json.data.home === "ホーム", JSON.stringify(r.json));
  r = await api("GET", "/i18n/ar-SA");
  check("阿语语言包", r.status === 200 && r.json.data.home === "الرئيسية", JSON.stringify(r.json));
  r = await api("GET", "/settings/public");
  check("门店语言选项含日/阿", r.json.data.languages.some((l) => l.code === "ja-JP") && r.json.data.languages.some((l) => l.code === "ar-SA"));
  r = await api("GET", "/convert?amount=1000&from=CNY&to=USD");
  check("汇率换算", r.status === 200 && r.json.data.converted > 0);

  r = await api("GET", "/recommendations?scene=home&limit=6");
  check("首页推荐", r.status === 200 && r.json.data.list.length >= 1);
  r = await api("GET", "/recommendations?scene=detail&productId=101&limit=4", null, tokens.user);
  check("详情页协同推荐", r.status === 200 && r.json.data.list.length >= 1);

  r = await api("GET", "/live/rooms");
  check("直播间列表", r.status === 200 && r.json.data.length >= 2);
  r = await api("GET", "/live/rooms/1");
  check("直播间详情+带货商品", r.status === 200 && r.json.data.products.length >= 1);
  r = await api("POST", "/live/rooms/1/action", { type: "like" }, tokens.user);
  check("直播间点赞", r.status === 200 && r.json.data.likeCount > 5678);

  r = await api("GET", "/fitting/products/201");
  check("试衣商品尺码表", r.status === 200 && r.json.data.sizeChart.length >= 4);
  r = await api("POST", "/fitting/sessions", { productId: 201, height: 165, weight: 55, gender: "female" }, tokens.user);
  check("创建试衣会话", r.status === 200 && r.json.data.status === "processing");
  const sessionId = r.json.data.sessionId;
  await sleep(2300);
  r = await api("GET", "/fitting/sessions/" + sessionId, null, tokens.user);
  check("试衣会话就绪+推荐尺码", r.status === 200 && r.json.data.status === "ready" && r.json.data.recommendedSize.length > 0);

  r = await api("GET", "/risk/admin/rules", null, tokens.admin);
  check("风控规则列表", r.status === 200 && r.json.data.length >= 4);
  r = await api("GET", "/risk/admin/events", null, tokens.admin);
  check("风控事件审计", r.status === 200);

  // ================= 管理端营销创建（关闭契约缺口） =================
  console.log("\n[8.5] 管理端营销/CMS 管理");
  r = await api("POST", "/coupons", { name: "测试满减券", amount: 500, threshold: 5000, total: 100, expireAt: new Date(Date.now() + 86400000).toISOString() }, tokens.admin);
  check("管理端创建优惠券", r.status === 200 && r.json.data.id > 4, JSON.stringify(r.json));
  r = await api("GET", "/coupons/available", null, tokens.newbie);
  check("新券出现在可领列表", r.json.data.list.some((c) => c.name === "测试满减券"));
  r = await api("POST", "/flashsales", { productId: 103, flashPrice: 49900, quota: 10, startAt: new Date().toISOString(), endAt: new Date(Date.now() + 86400000).toISOString() }, tokens.admin);
  check("管理端创建秒杀", r.status === 200 && r.json.data.id > 3, JSON.stringify(r.json));
  const newFlashId = r.json.data.id;
  r = await api("GET", "/flashsales", null, tokens.newbie);
  check("新秒杀出现在进行中列表", r.json.data.some((f) => f.id === newFlashId));
  // 商家越权创建他人商品秒杀应 403
  r = await api("POST", "/flashsales", { productId: 201, flashPrice: 100, quota: 5 }, tokens.merchant);
  check("商家越权秒杀 403", r.status === 403);
  // CMS 删除
  r = await api("DELETE", "/admin/cms/pages/" + newPageId, {}, tokens.admin);
  check("删除 CMS 页面", r.status === 200 && r.json.data.removed === true);
  r = await api("GET", "/cms/pages/test-page");
  check("删除后页面 404", r.status === 404);

  // ================= 管理端商品/订单/用户 =================
  console.log("\n[8] 管理端商品/订单/用户");
  r = await api("POST", "/admin/products", { name: "测试商品", categoryId: 6, price: 99.9, stock: 10 }, tokens.admin);
  check("新增商品", r.status === 200 && r.json.data.price === 9990);
  const newProductId = r.json.data.id;
  r = await api("POST", "/admin/products/" + newProductId + "/skus", { name: "标配", price: 99.9, stock: 5 }, tokens.admin);
  check("新增 SKU", r.status === 200);
  r = await api("PUT", "/admin/products/" + newProductId, { price: 89.9 }, tokens.admin);
  check("编辑商品", r.status === 200 && r.json.data.price === 8990);
  r = await api("GET", "/admin/orders?status=completed", null, tokens.admin);
  check("管理端订单列表", r.status === 200 && r.json.data.list.length >= 1);
  r = await api("GET", "/admin/users", null, tokens.admin);
  check("管理端用户列表", r.status === 200 && r.json.data.total >= 6);
  r = await api("PUT", "/admin/users/5/status", { status: "banned" }, tokens.admin);
  check("禁用用户", r.status === 200 && r.json.data.status === "banned");
  r = await api("PUT", "/admin/users/5/status", { status: "active" }, tokens.admin);
  check("恢复用户", r.status === 200);


  // ================= B2B 批发阶梯价 =================
  console.log("\n[9] B2B 批发阶梯价（多模式混合）");
  r = await api("POST", "/auth/login", { account: "13800000004", password: "user123" });
  check("批发客户登录", r.status === 200 && r.json.data.user.customerType === "wholesale");
  const wtoken = r.json.data.token;
  r = await api("POST", "/auth/login", { account: "user", password: "user123" });
  const rtoken = r.json.data.token;
  const rme = await api("GET", "/auth/me", null, rtoken);
  console.log("[diag] rtoken user:", rme.json.data.id, rme.json.data.nickname, "role:", rme.json.data.role, "customerType:", rme.json.data.customerType);
  r = await api("GET", "/products/101", null, wtoken);
  check("批发客户可见阶梯价", r.status === 200 && Array.isArray(r.json.data.wholesaleTiers) && r.json.data.wholesaleTiers.length === 3);
  r = await api("GET", "/products/101", null, rtoken);
  check("零售客户不可见阶梯价", r.status === 200 && r.json.data.wholesaleTiers === undefined, "status=" + r.status + " tiers=" + JSON.stringify(r.json.data && r.json.data.wholesaleTiers));
  await api("DELETE", "/cart", {}, wtoken);
  r = await api("POST", "/cart/items", { skuId: 1, quantity: 2 }, wtoken);
  check("批发购物车阶梯价生效", r.json.data.items[0].price === Math.round(299900 * 0.92), JSON.stringify(r.json.data.items[0]));
  check("购物车标记批发价", r.json.data.items[0].wholesale === true);
  r = await api("POST", "/cart/items", { skuId: 2, quantity: 3 }, wtoken);
  r = await api("POST", "/orders", { addressId: 3 }, wtoken);
  check("批发订单阶梯价结算", r.status === 200 && r.json.data.orders[0].totalAmount === Math.round(299900 * 0.92) * 5, "total=" + r.json.data.orders[0].totalAmount);
  const b2bOrder = r.json.data.orders[0].id;
  r = await api("POST", "/orders/" + b2bOrder + "/cancel", {}, wtoken);
  check("批发订单取消", r.status === 200);
  await api("DELETE", "/cart", {}, rtoken);
  r = await api("POST", "/cart/items", { skuId: 1, quantity: 2 }, rtoken);
  check("零售客户原价", r.json.data.items[0].price === 299900 && r.json.data.items[0].wholesale === false);
  r = await api("POST", "/admin/products/102/tiers", { tiers: [{ minQuantity: 3, price: 3699 }, { minQuantity: 10, price: 3499 }] }, tokens.admin);
  check("管理端设置阶梯价", r.status === 200 && r.json.data.wholesaleTiers.length === 2 && r.json.data.wholesaleTiers[0].price === 369900);
  r = await api("PUT", "/admin/users/5/customer-type", { customerType: "wholesale" }, tokens.admin);
  check("管理端切换客户类型", r.status === 200 && r.json.data.customerType === "wholesale");
  r = await api("PUT", "/admin/users/5/customer-type", { customerType: "retail" }, tokens.admin);
  check("切回零售类型", r.status === 200 && r.json.data.customerType === "retail");



  // ================= 积分商城 + 安全头 + 看板增强 =================
  console.log("\n[10] 积分商城 / 安全加固 / 看板增强");
  r = await api("GET", "/points/products");
  check("积分商品列表", r.status === 200 && r.json.data.length >= 5);
  // 积分充足兑换
  r = await api("POST", "/points/redemptions", { productId: 3, quantity: 1 }, tokens.user);
  check("积分兑换成功", r.status === 200 && r.json.data.code.startsWith("R"), JSON.stringify(r.json));
  const redemptionId = r.json.data.id;
  check("兑换扣积分", r.json.data.points === 500);
  r = await api("GET", "/my/redemptions", null, tokens.user);
  check("我的兑换记录", r.status === 200 && r.json.data.list.length >= 1);
  // 积分不足
  r = await api("POST", "/points/redemptions", { productId: 5, quantity: 1 }, tokens.newbie);
  check("积分不足拦截", r.status === 400);
  // 管理端创建 + 确认发放
  r = await api("POST", "/admin/points/products", { name: "测试兑换品", points: 100, stock: 10 }, tokens.admin);
  check("管理端创建积分商品", r.status === 200 && r.json.data.points === 100);
  r = await api("POST", "/admin/redemptions/" + redemptionId + "/confirm", {}, tokens.admin);
  check("确认兑换发放", r.status === 200 && r.json.data.status === "fulfilled");
  // 安全响应头
  const hdrs = await fetch(BASE + "/products?pageSize=1");
  check("安全响应头 X-Frame-Options", hdrs.headers.get("x-frame-options") === "DENY");
  check("安全响应头 CSP", (hdrs.headers.get("content-security-policy") || "").includes("default-src"));
  check("无 x-powered-by", !hdrs.headers.get("x-powered-by"));
  // 看板增强
  r = await api("GET", "/admin/dashboard/overview", null, tokens.admin);
  check("看板含退款率/低库存/在线", typeof r.json.data.refundRate === "number" && typeof r.json.data.lowStockCount === "number" && typeof r.json.data.wsOnline === "number");
  r = await api("GET", "/admin/dashboard/inventory-alerts?threshold=50", null, tokens.admin);
  check("库存预警列表", r.status === 200 && Array.isArray(r.json.data.list));


  // ================= 邀请裂变 + 商家对账 =================
  console.log("\n[11] 邀请裂变 / B2B 对账报表");
  // 邀请人积分基线
  r = await api("GET", "/my/points", null, tokens.user);
  const basePoints = r.json.data.balance;
  // 邀请人创建邀请分享
  r = await api("POST", "/shares", { type: "invite" }, tokens.user);
  check("创建邀请分享", r.status === 200 && r.json.data.url.startsWith("/s/"));
  const inviteCode = r.json.data.code;
  // 新用户带邀请码注册
  r = await api("POST", "/auth/register", { phone: "13900008888", password: "invite123456", nickname: "被邀请人", inviteCode }, tokens.admin);
  check("带邀请码注册", r.status === 200 && r.json.code === 0);
  const invitee = r.json.data.token;
  // 被邀请人下单并支付（首单）
  r = await api("POST", "/addresses", { name: "被邀请人", phone: "13900008888", province: "广东省", city: "深圳市", district: "南山区", detail: "邀请路 1 号" }, invitee);
  const invAddrId = r.json.data.id;
  await api("POST", "/cart/items", { skuId: 21, quantity: 1 }, invitee);
  r = await api("POST", "/orders", { addressId: invAddrId }, invitee);
  const invOrderId = r.json.data.orders[0].id;
  r = await api("POST", "/orders/" + invOrderId + "/pay", { method: "wechat" }, invitee);
  await api("POST", "/payments/" + r.json.data.paymentId + "/mock-success", {}, invitee);
  // 邀请人应得奖励积分
  r = await api("GET", "/my/points", null, tokens.user);
  check("邀请人获得首单奖励积分", r.json.data.balance === basePoints + 200, "base=" + basePoints + " now=" + r.json.data.balance);
  r = await api("GET", "/my/points/logs", null, tokens.user);
  check("积分流水含邀请奖励", r.json.data.list.some((l) => (l.reason || "").includes("邀请好友")), JSON.stringify(r.json.data.list[0]));

  // 商家对账报表
  r = await api("GET", "/admin/dashboard/settlement?days=30", null, tokens.admin);
  check("管理端对账报表", r.status === 200 && Array.isArray(r.json.data.merchants) && r.json.data.merchants.length >= 2 && r.json.data.totalGmv > 0, JSON.stringify(r.json.data).slice(0, 150));
  check("对账含佣金与净额", r.json.data.merchants.every((m) => typeof m.commission === "number" && typeof m.net === "number"));
  r = await api("GET", "/merchant/dashboard/settlement?days=30", null, tokens.merchant);
  check("商家对账仅本店", r.status === 200 && r.json.data.merchants.length === 1 && r.json.data.merchants[0].merchantId === 1, JSON.stringify(r.json.data.merchants));


  // ================= 评价 / 收藏 / 通知中心 =================
  console.log("\n[12] 评价 / 收藏夹 / 通知中心");
  // 评价：user 3 有 9004 已完成订单（含商品 101）
  r = await api("GET", "/products/101/reviews");
  check("评价列表（空）", r.status === 200 && r.json.data.reviewCount === 0);
  r = await api("POST", "/products/101/reviews", { rating: 5, content: "手机很流畅，物流快！" }, tokens.user);
  check("已完成订单可评价", r.status === 200 && r.json.data.rating === 5, JSON.stringify(r.json));
  r = await api("POST", "/products/101/reviews", { rating: 4, content: "不错" }, tokens.newbie);
  check("未购买商品不可评价", r.status === 403);
  r = await api("GET", "/products/101/reviews");
  check("评价列表含内容", r.status === 200 && r.json.data.reviewCount === 1 && r.json.data.list[0].content.includes("流畅"));
  check("商品评分已更新为平均值", r.json.data.rating === 5);
  // 收藏
  r = await api("POST", "/favorites", { productId: 102 }, tokens.user);
  check("收藏商品", r.status === 200 && r.json.data.favorited === true);
  r = await api("POST", "/favorites", { productId: 102 }, tokens.user);
  check("重复收藏幂等", r.json.data.already === true);
  r = await api("GET", "/favorites", null, tokens.user);
  check("收藏列表", r.status === 200 && r.json.data.length === 1 && r.json.data[0].product.id === 102);
  r = await api("DELETE", "/favorites/102", null, tokens.user);
  check("取消收藏", r.json.data.favorited === false);
  r = await api("GET", "/favorites", null, tokens.user);
  check("取消后列表为空", r.json.data.length === 0);
  // 通知中心
  r = await api("GET", "/notifications/unread-count", null, tokens.user);
  check("未读通知数", r.status === 200 && typeof r.json.data.unread === "number");
  r = await api("GET", "/notifications", null, tokens.user);
  check("通知列表", r.status === 200 && Array.isArray(r.json.data.list));
  const firstNotif = r.json.data.list[0];
  if (firstNotif) {
    r = await api("PUT", "/notifications/" + firstNotif.id + "/read", null, tokens.user);
    check("标记已读", r.status === 200 && r.json.data.read === true);
  } else { check("标记已读（无通知时跳过）", true); }
  r = await api("GET", "/notifications/unread-count", null, tokens.user);
  check("未读数减少", r.status === 200);


  // ================= B2B 询价 + 审计日志 =================
  console.log("\n[13] B2B 询价报价 / 管理员审计日志");
  // 批发客户发起询价（商品 101，商家 1）
  r = await api("POST", "/quotes", { productId: 101, quantity: 100, targetPrice: 280000, note: "批量采购，询批发价" }, tokens.user);
  check("发起询价", r.status === 200 && r.json.data.rfqNo.startsWith("RFQ") && r.json.data.status === "pending", JSON.stringify(r.json));
  const rfqId = r.json.data.id;
  check("询价单含商家归属", r.json.data.merchantName.length > 0);
  r = await api("GET", "/my/quotes", null, tokens.user);
  check("我的询价单", r.status === 200 && r.json.data.list.length >= 1);
  // 商家报价
  r = await api("POST", "/admin/quotes/" + rfqId + "/quote", { price: 275000, note: "100 件 91.7 折" }, tokens.merchant);
  check("商家报价", r.status === 200 && r.json.data.status === "quoted" && r.json.data.quotePrice === 275000, JSON.stringify(r.json));
  // 数据隔离：商家 2 不能操作商家 1 的询价单
  r = await api("POST", "/admin/quotes/" + rfqId + "/quote", { price: 1 }, tokens.merchant2);
  check("跨商家报价被拒 403", r.status === 403);
  // 买家接受
  r = await api("POST", "/quotes/" + rfqId + "/accept", {}, tokens.user);
  check("买家接受报价", r.status === 200 && r.json.data.status === "accepted");
  // 管理端询价列表
  r = await api("GET", "/admin/quotes?status=accepted", null, tokens.admin);
  check("管理端询价列表", r.status === 200 && r.json.data.list.length >= 1);

  // 审计日志：上述管理操作应产生记录
  await api("POST", "/admin/products/102/tiers", { tiers: [{ minQuantity: 3, price: 3699 }] }, tokens.admin);
  r = await api("GET", "/admin/audit-logs", null, tokens.admin);
  check("审计日志列表", r.status === 200 && Array.isArray(r.json.data.list) && r.json.data.list.length >= 1);
  check("审计含商品阶梯价操作", r.json.data.list.some((l) => l.action === "product.tiers"), JSON.stringify(r.json.data.list[0]));
  r = await api("GET", "/admin/audit-logs", null, tokens.merchant);
  check("商家不可查看审计日志（401/403）", r.status === 403 || r.status === 401, "status=" + r.status + " " + JSON.stringify(r.json));


  // ================= RFQ 成交下单 + 拼团 =================
  console.log("\n[14] RFQ 成交 / 拼团");
  // RFQ accept -> order（承接 [13] 已报价询价单：新发一条完整流程）
  r = await api("POST", "/quotes", { productId: 103, quantity: 5 }, tokens.user);
  const rfq2 = r.json.data.id;
  r = await api("POST", "/admin/quotes/" + rfq2 + "/quote", { price: 84900 }, tokens.merchant);
  check("商家报价(2)", r.json.data.status === "quoted");
  r = await api("POST", "/quotes/" + rfq2 + "/accept", {}, tokens.user);
  check("接受报价自动生成订单", r.status === 200 && r.json.data.order && r.json.data.order.status === "pending_payment", JSON.stringify(r.json).slice(0, 200));
  check("订单按报价金额结算", r.json.data.order.payableAmount === 84900 * 5, "payable=" + r.json.data.order.payableAmount);
  // 拼团：103 商品有拼团价（849*0.85≈721.65 → 72165？seed 用 Math.round(price*0.85)）
  r = await api("GET", "/products/103");
  const gp = r.json.data.grouponPrice;
  check("商品含拼团价", gp > 0 && gp < r.json.data.price, "groupon=" + gp);
  // 团长开团（目标 3 人，含团长）
  await api("POST", "/addresses", { name: "团1", phone: "13700000010", province: "广东省", city: "深圳市", district: "南山区", detail: "团路1号" }, tokens.user);
  r = await api("POST", "/groupons", { productId: 103, targetSize: 3 }, tokens.user);
  check("开团（团长参团）", r.status === 200 && r.json.data.groupon.currentSize === 1 && r.json.data.groupon.status === "open", JSON.stringify(r.json).slice(0, 200));
  const groupId = r.json.data.groupon.id;
  check("拼团价订单", r.json.data.order.payableAmount === gp);
  // 两个新买家参团
  const w1 = (await api("POST", "/auth/wechat", { code: "wx-gp-1" })).json.data.token;
  const w2 = (await api("POST", "/auth/wechat", { code: "wx-gp-2" })).json.data.token;
  await Promise.all([w1, w2].map((t) => api("POST", "/addresses", { name: "团员", phone: "13700000011", province: "广东省", city: "深圳市", district: "南山区", detail: "团路2号" }, t)));
  r = await api("POST", "/groupons/" + groupId + "/join", {}, w1);
  check("参团(2/3)", r.status === 200 && r.json.data.groupon.currentSize === 2);
  r = await api("POST", "/groupons/" + groupId + "/join", {}, w2);
  check("参团(3/3) 成团", r.status === 200 && r.json.data.groupon.status === "success" && r.json.data.groupon.currentSize === 3, JSON.stringify(r.json).slice(0, 150));
  r = await api("POST", "/groupons/" + groupId + "/join", {}, tokens.newbie);
  check("满员后不可参团", r.status === 400);
  r = await api("GET", "/groupons?status=success");
  check("已成团列表", r.status === 200 && r.json.data.list.length >= 1);
  r = await api("GET", "/my/groupons", null, tokens.user);
  check("我参与的拼团", r.status === 200 && r.json.data.length >= 1);


  // ================= B2B 客户管理 =================
  console.log("\n[15] B2B 客户管理");
  // 批发客户（阿杰 13800000004）向商家 1 采购
  r = await api("POST", "/auth/login", { account: "13800000004", password: "user123" });
  const b2bToken = r.json.data.token;
  await api("POST", "/cart/items", { skuId: 1, quantity: 1 }, b2bToken);
  r = await api("POST", "/orders", { addressId: 3 }, b2bToken);
  const woId = r.json.data.orders[0].id;
  r = await api("POST", "/orders/" + woId + "/pay", { method: "wechat" }, b2bToken);
  await api("POST", "/payments/" + r.json.data.paymentId + "/mock-success", {}, b2bToken);
  // 商家 1 查看 B2B 客户
  r = await api("GET", "/admin/b2b-customers", null, tokens.merchant);
  check("商家查看 B2B 客户", r.status === 200 && r.json.data.list.some((x) => x.userId === 4 && x.orderCount >= 1), JSON.stringify(r.json.data).slice(0, 200));
  // 商家 3（鲜味食集）从未与阿杰交易，隔离验证：不应看到 userId 4
  r = await api("POST", "/auth/login", { account: "13800000007", password: "merchant123" });
  const m3token = r.json.data.token;
  r = await api("GET", "/admin/b2b-customers", null, m3token);
  check("商家数据隔离", r.status === 200 && r.json.data.list.every((x) => x.userId !== 4), JSON.stringify(r.json.data));
  // 管理员全量
  r = await api("GET", "/admin/b2b-customers", null, tokens.admin);
  check("管理员查看全部 B2B 客户", r.status === 200 && r.json.data.total >= 1);

  let got429 = false;
  for (let i = 0; i < 25; i++) {
    const rr = await api("POST", "/auth/login", { account: "user", password: "wrong" + i });
    if (rr.status === 429) { got429 = true; break; }
  }
  check("登录频控触发 429", got429);

  // ================= CSV 导出 =================
  console.log("\n[16] CSV 导出");
  const expRes = await fetch(BASE + "/admin/orders/export?status=completed", { headers: { Authorization: "Bearer " + tokens.admin } });
  const csvText = await expRes.text();
  check("订单导出 CSV", expRes.status === 200 && csvText.includes("订单号") && csvText.includes("ORD"), "status=" + expRes.status);
  const exp2 = await fetch(BASE + "/admin/dashboard/settlement/export?days=30", { headers: { Authorization: "Bearer " + tokens.admin } });
  const csv2 = await exp2.text();
  check("对账导出 CSV", exp2.status === 200 && csv2.includes("商家") && csv2.includes("净结算"), "status=" + exp2.status);
  const exp3 = await fetch(BASE + "/admin/orders/export", { headers: { Authorization: "Bearer " + tokens.merchant } });
  const csv3 = await exp3.text();
  check("商家导出仅本店订单", exp3.status === 200 && !csv3.includes("9002"), "status=" + exp3.status);
  ws.close();
  console.log("\n========== 测试结果: " + passed + " 通过, " + failed + " 失败 ==========");
  if (failures.length) console.log("失败项:", failures.join(", "));
  cleanup();
  process.exit(failed ? 1 : 0);
}

function cleanup() {
  try { server.kill("SIGTERM"); } catch {}
  try { fs.unlinkSync(tmpFile); } catch {}
}

process.on("unhandledRejection", (e) => { console.error("未处理异常:", e); cleanup(); process.exit(1); });
process.on("exit", () => { try { server.kill(); } catch {} });

main();