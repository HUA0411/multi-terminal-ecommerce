// 订单超时自动取消测试（短 TTL 服务实例）
// 用法: node test/timeout.mjs
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4197;
const BASE = "http://127.0.0.1:" + PORT + "/api/v1";
const tmpFile = path.join(os.tmpdir(), "ecom-timeout-" + Date.now() + ".json");

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log("  [PASS] " + name); }
  else { failed++; console.log("  [FAIL] " + name + " " + (extra || "")); }
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

console.log("[timeout] 启动短 TTL 服务实例...");
const server = spawn(process.execPath, [path.join(__dirname, "..", "src", "index.js")], {
  env: { ...process.env, PORT: String(PORT), DATA_FILE: tmpFile, ORDER_TIMEOUT_MINUTES: "0.02", SWEEPER_INTERVAL_MS: "500" },
  stdio: "pipe",
});
server.stderr.on("data", (d) => process.stderr.write("[srv-err] " + d));

async function waitHealth() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE + "/health"); if (r.ok) return true; } catch {}
    await sleep(400);
  }
  return false;
}

async function main() {
  const up = await waitHealth();
  check("服务启动", up);
  if (!up) { cleanup(); process.exit(1); }

  const u = (await api("POST", "/auth/login", { account: "user", password: "user123" })).json.data.token;

  console.log("\n[1] 普通订单超时自动取消");
  const stockBefore = (await api("GET", "/products/106")).json.data.stock;
  await api("POST", "/cart/items", { skuId: 21, quantity: 2 }, u);
  const order = await api("POST", "/orders", { addressId: 1, couponId: 1 }, u);
  const oid = order.json.data.orders[0].id;
  check("创建待付款订单", order.status === 200 && order.json.data.orders[0].status === "pending_payment");
  check("下单已占用优惠券", (await api("GET", "/my/coupons?status=used", null, u)).json.data.list.some((c) => c.orderId === oid));
  // 等待 sweeper（TTL 1.2s，扫描 500ms）
  await sleep(4000);
  const after = await api("GET", "/orders/" + oid, null, u);
  check("订单被自动取消", after.json.data.status === "cancelled", "status=" + after.json.data.status);
  check("优惠券已退回", (await api("GET", "/my/coupons?status=unused", null, u)).json.data.list.some((c) => c.couponId === 1));
  const stockAfter = (await api("GET", "/products/106")).json.data.stock;
  check("库存已回补到原值", stockAfter === stockBefore, "before=" + stockBefore + " after=" + stockAfter);

  console.log("\n[2] 秒杀未支付订单超时释放名额");
  const fsInfo = (await api("GET", "/flashsales", null, u)).json.data.find((f) => f.id === 2);
  const soldBefore = fsInfo.sold;
  const wx = (await api("POST", "/auth/wechat", { code: "wx-timeout-1" })).json.data.token;
  await api("POST", "/addresses", { name: "T", phone: "13700000001", province: "广东省", city: "深圳市", district: "南山区", detail: "测试路" }, wx);
  const sec = await api("POST", "/flashsales/2/seckill", { skuId: 14 }, wx);
  check("秒杀下单成功", sec.status === 200 && sec.json.data.ok === true, "status=" + sec.status + " " + JSON.stringify(sec.json));
  const fsOrderId = sec.json.data.order.id;
  await sleep(4000);
  const fsAfter = await api("GET", "/orders/" + fsOrderId, null, wx);
  check("秒杀订单超时取消", fsAfter.json.data.status === "cancelled");
  const fsInfo2 = (await api("GET", "/flashsales", null, u)).json.data.find((f) => f.id === 2);
  check("秒杀名额已释放", fsInfo2.sold === soldBefore, "before=" + soldBefore + " after=" + fsInfo2.sold);

  console.log("\n========== 超时测试: " + passed + " 通过, " + failed + " 失败 ==========");
  cleanup();
  process.exit(failed ? 1 : 0);
}

function cleanup() {
  try { server.kill("SIGTERM"); } catch {}
  try { fs.unlinkSync(tmpFile); } catch {}
}
process.on("unhandledRejection", (e) => { console.error("未处理异常:", e.message); cleanup(); process.exit(1); });
process.on("exit", () => { try { server.kill(); } catch {} });
main();