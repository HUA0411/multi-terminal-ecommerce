// 高并发压测：秒杀防超卖 + 频控 + 库存一致性
// 用法: node test/concurrency.mjs   （自动启动独立服务实例）
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4198;
const BASE = "http://127.0.0.1:" + PORT + "/api/v1";
const tmpFile = path.join(os.tmpdir(), "ecom-conc-" + Date.now() + ".json");

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

console.log("[conc] 启动服务实例...");
const server = spawn(process.execPath, [path.join(__dirname, "..", "src", "index.js")], {
  env: { ...process.env, PORT: String(PORT), DATA_FILE: tmpFile },
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

  console.log("\n[1] 秒杀并发防超卖（quota=50, 已售23 → 剩余27）");
  const fsInfo = await api("GET", "/flashsales");
  const fs1 = fsInfo.json.data.find((f) => f.id === 1);
  check("秒杀活动信息", !!fs1 && fs1.remaining === 27, JSON.stringify(fs1));
  const remaining = fs1.remaining;

  // 准备 60 个独立买家（微信 mock 登录避开注册频控 + 每用户限购）
  const tokens = [];
  const regs = [];
  for (let i = 0; i < 60; i++) {
    regs.push(api("POST", "/auth/wechat", { code: "wx-conc-" + i }).then((r) => r.json.data.token));
  }
  const all = await Promise.all(regs);
  tokens.push(...all.filter(Boolean));
  check("并发登录 60 个买家", tokens.length === 60, "got " + tokens.length);
  // 每个买家先建地址
  await Promise.all(tokens.map((t) => api("POST", "/addresses", { name: "买家", phone: "13700000000", province: "广东省", city: "深圳市", district: "南山区", detail: "压测路 1 号" }, t)));

  // 60 并发秒杀
  const start = Date.now();
  const results = await Promise.all(tokens.map((t) => api("POST", "/flashsales/1/seckill", { skuId: 6 }, t)));
  const elapsed = Date.now() - start;
  const ok = results.filter((r) => r.status === 200 && r.json.code === 0);
  const soldOut = results.filter((r) => r.status === 400 && (r.json.message || "").includes("抢光"));
  const rateLimited = results.filter((r) => r.status === 429);
  const other = results.filter((r) => !ok.includes(r) && !soldOut.includes(r) && !rateLimited.includes(r));
  console.log("  并发耗时 " + elapsed + "ms | 成功 " + ok.length + " | 已抢光 " + soldOut.length + " | 频控 " + rateLimited.length + " | 其他 " + other.length);
  check("恰好卖出剩余额度（无超卖）", ok.length === remaining, "success=" + ok.length + " remaining=" + remaining);
  check("其余请求被正确拒绝", soldOut.length + rateLimited.length + other.length === tokens.length - ok.length);
  check("无 5xx 错误", other.length === 0, JSON.stringify(other.map((r) => r.json)));
  // 库存一致性：秒杀后 sold 恰好 = quota
  const fsAfter = await api("GET", "/flashsales");
  const f1a = fsAfter.json.data.find((f) => f.id === 1);
  check("秒杀后 sold = quota（无超卖）", f1a.sold === fs1.quota, "sold=" + f1a.sold + " quota=" + fs1.quota);
  const prod = await api("GET", "/products/103");
  check("商品库存未被扣为负数", prod.json.data.stock >= 0, "stock=" + prod.json.data.stock);

  console.log("\n[2] 秒杀频控（同一用户 3 次/分 限流）");
  const u = (await api("POST", "/auth/login", { account: "user", password: "user123" })).json.data.token;
  let got429 = false;
  const spam = [];
  for (let i = 0; i < 6; i++) spam.push(api("POST", "/flashsales/2/seckill", { skuId: 8 }, u));
  const spamRes = await Promise.all(spam);
  got429 = spamRes.some((r) => r.status === 429);
  const accepted = spamRes.filter((r) => r.status === 200).length;
  check("频控触发 429", got429);
  check("每用户限购 1 单", accepted <= 1, "accepted=" + accepted);

  console.log("\n[3] 普通接口并发（购物车/商品列表）");
  const reads = [];
  for (let i = 0; i < 50; i++) reads.push(api("GET", "/products?pageSize=10"));
  const readRes = await Promise.all(reads);
  const readOk = readRes.filter((r) => r.status === 200).length;
  check("50 并发商品列表全部 200", readOk === 50, readOk + "/50");

  console.log("\n[4] 普通下单并发（30 用户同时下单+支付）");
  const buyers = [];
  for (let i = 0; i < 30; i++) {
    buyers.push(api("POST", "/auth/wechat", { code: "wx-order-" + i }).then((r) => r.json.data.token));
  }
  const bt = await Promise.all(buyers);
  const prodBefore = await api("GET", "/products/202");
  const stockBefore = prodBefore.json.data.stock;
  // 每个买家并发加购 1 件商品 202（sku 21）
  await Promise.all(bt.map((t) => api("POST", "/cart/items", { skuId: 21, quantity: 1 }, t)));
  // 并发下单
  const orderRes = await Promise.all(bt.map((t) => api("POST", "/orders", { address: { name: "买家", phone: "13700000001", province: "广东省", city: "深圳市", district: "南山区", detail: "并发路 1 号" } }, t)));
  const okOrders = orderRes.filter((r) => r.status === 200 && r.json.code === 0);
  check("30 并发下单全部成功", okOrders.length === 30, okOrders.length + "/30");
  // 并发支付
  const payRes = await Promise.all(okOrders.map(async (o) => {
    const oid = o.json.data.orders[0].id;
    const t = bt[orderRes.indexOf(o)];
    const pay = await api("POST", "/orders/" + oid + "/pay", { method: "wechat" }, t);
    return api("POST", "/payments/" + pay.json.data.paymentId + "/mock-success", {}, t);
  }));
  const paid = payRes.filter((r) => r.status === 200).length;
  check("并发支付成功", paid === 30, paid + "/30");
  const prodAfter = await api("GET", "/products/202");
  const stock = prodAfter.json.data.stock;
  check("并发扣库存精确（" + stockBefore + " - 30 = " + (stockBefore - 30) + "）", stock === stockBefore - 30, "stock=" + stock + " expected=" + (stockBefore - 30));

  console.log("\n========== 并发压测: " + passed + " 通过, " + failed + " 失败 ==========");
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