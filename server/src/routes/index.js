import { Router } from "express";
import authRouter from "./auth.js";
import { productRouter, categoriesRouter, searchRouter } from "./products.js";
import cartRouter from "./cart.js";
import addressesRouter from "./addresses.js";
import ordersRouter from "./orders.js";
import paymentsRouter from "./payments.js";
import aftersalesRouter from "./aftersales.js";
import marketingRouter from "./marketing.js";
import { cmsPublicRouter, cmsAdminRouter } from "./cms.js";
import dashboardRouter from "./dashboard.js";
import { merchantRouter, merchantAdminRouter } from "./merchants.js";
import i18nRouter from "./i18n.js";
import recommendRouter from "./recommend.js";
import liveRouter from "./live.js";
import fittingRouter from "./fitting.js";
import riskRouter from "./risk.js";
import pointsRouter from "./points.js";
import socialRouter from "./social.js";
import notificationsRouter from "./notifications.js";
import quotesRouter from "./quotes.js";
import grouponsRouter from "./groupons.js";
import adminRouter from "./admin.js";

const api = Router();

api.use("/auth", authRouter);
api.use("/products", productRouter);
api.use("/categories", categoriesRouter);
api.use("/search", searchRouter);
api.use("/cart", cartRouter);
api.use("/addresses", addressesRouter);
api.use("/orders", ordersRouter);
api.use("/payments", paymentsRouter);
api.use("/aftersales", aftersalesRouter);
api.use(marketingRouter);            // /coupons /flashsales /shares /my/*
api.use("/cms", cmsPublicRouter);
api.use("/merchants", merchantRouter);
api.use(i18nRouter);                 // /settings/public /i18n/:lang /currencies /convert
api.use("/recommendations", recommendRouter);
api.use("/live", liveRouter);
api.use("/fitting", fittingRouter);
api.use("/risk", riskRouter);
api.use(pointsRouter);
api.use(socialRouter);
api.use("/notifications", notificationsRouter);
api.use(quotesRouter);
api.use(grouponsRouter);

// 管理端
api.use("/admin", adminRouter);
api.use("/admin/cms", cmsAdminRouter);
api.use("/admin/merchants", merchantAdminRouter);
api.use("/admin/dashboard", dashboardRouter);
api.use("/merchant/dashboard", dashboardRouter);

api.get("/health", (req, res) => res.json({ code: 0, data: { status: "up", ts: new Date().toISOString() }, message: "ok" }));

export default api;