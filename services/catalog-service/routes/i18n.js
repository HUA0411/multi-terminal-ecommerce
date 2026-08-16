import { Router } from "express";
import store from "../../_shared/store.js";
import { asyncHandler, ok, fail } from "../../_shared/util.js";
import { convert, currencySymbol } from "./common.js";
import { cache } from "../../_shared/middleware.js";

const router = Router();

// 门店公共配置（语言/币种/支付方式/开关）
router.get("/settings/public", asyncHandler(async (req, res) => {
  const cached = await cache.get("settings:public");
  if (cached) return res.json(ok(cached));
  const languages = [{ code: "zh-CN", name: "简体中文" }, { code: "en-US", name: "English" }, { code: "ja-JP", name: "日本語" }, { code: "ar-SA", name: "العربية" }];
  const currencies = store.all("currencies").filter((c) => c.status === "active").map((c) => ({ code: c.code, name: c.name, symbol: c.symbol, rate: c.rate, isDefault: c.isDefault }));
  const defaultCurrency = store.findOne("currencies", (c) => c.isDefault).code;
  const result = {
    storeName: "多端商城 Demo",
    logo: "https://picsum.photos/seed/logo/120/120",
    languages,
    defaultLanguage: "zh-CN",
    currencies,
    defaultCurrency,
    paymentMethods: [{ code: "wechat", name: "微信支付" }, { code: "alipay", name: "支付宝" }],
    features: { seckill: true, live: true, fitting: true, recommend: true, points: true, coupons: true, multiMerchant: true, i18n: true, multiCurrency: true, cms: true, dashboard: true, risk: true },
  };
  await cache.set("settings:public", result, 60_000);
  res.json(ok(result));
}));

// 语言包
router.get("/i18n/:lang", asyncHandler(async (req, res) => {
  const lang = req.params.lang;
  const row = store.findOne("translations", (t) => t.lang === lang);
  if (!row) return fail(404, 404, "语言包不存在");
  res.json(ok(row.data));
}));

// 币种列表
router.get("/currencies", asyncHandler(async (req, res) => {
  res.json(ok(store.all("currencies").filter((c) => c.status === "active").map((c) => ({ code: c.code, name: c.name, symbol: c.symbol, rate: c.rate, isDefault: c.isDefault }))));
}));

// 汇率换算
router.get("/convert", asyncHandler(async (req, res) => {
  const { amount, from = "CNY", to = "CNY" } = req.query;
  const cents = Math.round(Number(amount) || 0);
  const converted = convert(cents, from, to);
  res.json(ok({ amount: cents, from, to, converted, symbol: currencySymbol(to), rate: store.findOne("currencies", (c) => c.code === to)?.rate || 1 }));
}));

export default router;
