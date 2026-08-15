// 单元测试：价格/阶梯价/币种换算/序列化等纯逻辑
// 用法: node test/unit.mjs
import { store } from "../src/store.js";
import { tierPrice, effectiveUnitPrice, isWholesaleUser, serializeProduct, convert } from "../src/routes/common.js";

let passed = 0, failed = 0;
function eq(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log("  [PASS] " + name); }
  else { failed++; console.log("  [FAIL] " + name + " expected=" + JSON.stringify(expected) + " got=" + JSON.stringify(actual)); }
}

store.init();

console.log("[1] B2B 阶梯价 tierPrice");
const p = { wholesaleTiers: [{ minQuantity: 2, price: 9200 }, { minQuantity: 5, price: 8500 }, { minQuantity: 20, price: 7800 }] };
eq("数量1 无档位", tierPrice(p, 1), null);
eq("数量2 命中92折档", tierPrice(p, 2), { minQuantity: 2, price: 9200 });
eq("数量5 命中85折档", tierPrice(p, 5), { minQuantity: 5, price: 8500 });
eq("数量50 命中最优78折档", tierPrice(p, 50), { minQuantity: 20, price: 7800 });
eq("无阶梯价返回 null", tierPrice({}, 3), null);

console.log("[2] effectiveUnitPrice（批发/零售）");
const prod = { id: 1, price: 10000, wholesaleTiers: [{ minQuantity: 2, price: 9000 }] };
const sku = { id: 1, price: 10000 };
const retail = { customerType: "retail" };
const wholesale = { customerType: "wholesale" };
eq("零售原价", effectiveUnitPrice(prod, sku, 5, retail), 10000);
eq("批发数量1 原价", effectiveUnitPrice(prod, sku, 1, wholesale), 10000);
eq("批发数量2 阶梯价", effectiveUnitPrice(prod, sku, 2, wholesale), 9000);
eq("isWholesaleUser 判定", isWholesaleUser(wholesale), true);
eq("isWholesaleUser 零售判定", isWholesaleUser(retail), false);

console.log("[3] 币种换算 convert");
const cny = convert(10000, "CNY", "CNY");
eq("CNY->CNY 不变", cny, 10000);
const usd = convert(10000, "CNY", "USD");
eq("CNY->USD 按汇率(0.14)", usd, 1400);
const back = convert(1400, "USD", "CNY");
eq("USD->CNY 还原", back, 10000);

console.log("[4] serializeProduct 可见性/字段");
const pp = store.get("products", 101);
const withTiers = serializeProduct(pp, "CNY", { showTiers: true });
eq("showTiers 输出阶梯价", Array.isArray(withTiers.wholesaleTiers) && withTiers.wholesaleTiers.length, 3);
const noTiers = serializeProduct(pp, "CNY", {});
eq("默认不输出阶梯价", noTiers.wholesaleTiers, undefined);
const usdProd = serializeProduct(pp, "USD");
eq("USD 显示价换算", usdProd.price, Math.round(pp.price * 0.14));

console.log("[5] 订单状态文案 ORDER_STATUS");
import { ORDER_STATUS } from "../src/routes/common.js";
eq("pending_payment 文案", ORDER_STATUS.pending_payment, "待付款");
eq("refunded 文案", ORDER_STATUS.refunded, "已退款");

console.log("\n========== 单元测试: " + passed + " 通过, " + failed + " 失败 ==========");
process.exit(failed ? 1 : 0);
