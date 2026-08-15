import { Router } from "express";
import store from "../store.js";
import { auth } from "../middleware.js";
import { asyncHandler, ok, fail, paginate, orderNo, now, uid } from "../util.js";
import { serializeOrder, cartSummary, effectiveUnitPrice, pushDashboard } from "./common.js";

const router = Router();
router.use(auth());

function notify(req, userId, title, body) {
  if (req.app.locals.ws) req.app.locals.ws.publishToUser(userId, { type: "notify", data: { title, body } });
}

// 下单（购物车 -> 订单，按商家拆单）
// 地址二选一：addressId（服务端地址薄）或 address 快照 {name, phone, province?, city?, district?, detail}
router.post("/", asyncHandler(async (req, res) => {
  const { cartItemIds, addressId, couponId, remark, currency } = req.body || {};
  let address = null;
  if (addressId) {
    address = store.findOne("addresses", (a) => a.id === Number(addressId) && a.userId === req.user.id);
  } else if (req.body.address && req.body.address.name && req.body.address.phone && req.body.address.detail) {
    const a = req.body.address;
    address = { name: a.name, phone: a.phone, province: a.province || "", city: a.city || "", district: a.district || "", detail: a.detail };
  }
  if (!address) return fail(400, 400, "请选择有效的收货地址");

  const cart = cartSummary(req.user.id, undefined, req.user);
  let picked = cart.items.filter((i) => (cartItemIds && cartItemIds.length ? cartItemIds.map(Number).includes(i.id) : i.checked));
  if (!picked.length) return fail(400, 400, "请选择要结算的商品");

  // 校验并锁定库存
  for (const it of picked) {
    const sku = store.get("productSkus", it.skuId);
    if (!sku || sku.stock < it.quantity) return fail(400, 400, `「${it.productName}」库存不足`);
  }

  // 优惠券校验
  let coupon = null;
  if (couponId) {
    const uc = store.findOne("userCoupons", (c) => c.id === Number(couponId) && c.userId === req.user.id && c.status === "unused");
    coupon = uc ? store.get("coupons", uc.couponId) : null;
    if (!coupon) return fail(400, 400, "优惠券不可用");
    const nowT = Date.now();
    if (new Date(coupon.startAt) > nowT || new Date(coupon.endAt) < nowT) return fail(400, 400, "优惠券不在有效期内");
  }

  // 按商家分组
  const byMerchant = {};
  for (const it of picked) {
    const product = store.get("products", it.productId);
    const mid = product ? product.merchantId : 1;
    (byMerchant[mid] ||= []).push(it);
  }

  const createdOrders = [];
  let couponApplied = false;
  for (const [mid, items] of Object.entries(byMerchant)) {
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0); // price 已按 currency 换算 -> 需还原 CNY
    // 还原 CNY 金额（B2B：批发客户按阶梯价）
    const cnyTotal = items.reduce((s, i) => {
      const sku = store.get("productSkus", i.skuId);
      const product = sku ? store.get("products", sku.productId) : null;
      const unit = effectiveUnitPrice(product, sku, i.quantity, req.user);
      return s + unit * i.quantity;
    }, 0);
    let discount = 0;
    let usedCoupon = null;
    // 优惠券应用：平台券可作用于任意单；商家券只作用于本商家单
    if (coupon && !couponApplied) {
      const platform = !coupon.merchantId;
      const matchMerchant = coupon.merchantId === Number(mid);
      const thresholdOk = cnyTotal >= coupon.threshold;
      if ((platform || matchMerchant) && thresholdOk) {
        usedCoupon = coupon;
        discount = coupon.type === "discount" ? cnyTotal - Math.round((cnyTotal * coupon.value) / 100) : Math.min(coupon.value, cnyTotal);
        couponApplied = true;
      }
    }
    const payable = cnyTotal - discount;
    const order = store.insert("orders", {
      orderNo: orderNo(),
      userId: req.user.id,
      merchantId: Number(mid),
      status: "pending_payment",
      totalAmount: cnyTotal,
      discountAmount: discount,
      couponId: usedCoupon ? usedCoupon.id : null,
      couponAmount: usedCoupon ? discount : 0,
      payableAmount: payable,
      currency: "CNY",
      paymentMethod: null,
      address: { name: address.name, phone: address.phone, province: address.province || "", city: address.city || "", district: address.district || "", detail: address.detail, addressLabel: `${address.province || ""} ${address.city || ""} ${address.district || ""} ${address.detail}`.trim() },
      remark: remark || "",
      paidAt: null, shippedAt: null, completedAt: null,
    });
    items.forEach((it, idx) => {
      const sku = store.get("productSkus", it.skuId);
      store.insert("orderItems", {
        orderId: order.id,
        productId: it.productId,
        skuId: it.skuId,
        productName: it.productName,
        skuName: it.skuName,
        image: it.image,
        price: sku ? effectiveUnitPrice(store.get("products", sku.productId), sku, it.quantity, req.user) : it.price,
        quantity: it.quantity,
        subtotal: (sku ? effectiveUnitPrice(store.get("products", sku.productId), sku, it.quantity, req.user) : it.price) * it.quantity,
      });
      // 扣库存
      if (sku) {
        store.update("productSkus", sku.id, { stock: sku.stock - it.quantity });
        const p = store.get("products", sku.productId);
        if (p) store.update("products", p.id, { stock: Math.max(0, p.stock - it.quantity) });
      }
      // 删除购物车项
      store.remove("cartItems", it.id);
    });
    createdOrders.push(order);
  }

  // 优惠券标记已使用
  if (couponApplied && coupon) {
    const uc = store.findOne("userCoupons", (c) => c.couponId === coupon.id && c.userId === req.user.id && c.status === "unused");
    if (uc) store.update("userCoupons", uc.id, { status: "used", usedAt: now(), orderId: createdOrders[0].id });
  }

  if (req.app.locals.ws) req.app.locals.ws.publishToUser(req.user.id, { type: "cart:changed", data: { totalQuantity: cartSummary(req.user.id, undefined, req.user).totalQuantity, updatedAt: now() } });
  notify(req, req.user.id, "下单成功", `已生成 ${createdOrders.length} 笔订单，请尽快完成支付`);
  pushDashboard(req, "dashboard:changed", { action: "order.created", count: createdOrders.length });
  res.json(ok({ orders: createdOrders.map((o) => serializeOrder(o, currency)) }));
}));

// 订单列表
router.get("/", asyncHandler(async (req, res) => {
  const { status, page, pageSize, currency } = req.query;
  let list = store.find("orders", (o) => o.userId === req.user.id);
  if (status) list = list.filter((o) => o.status === status);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const result = paginate(list.map((o) => serializeOrder(o, currency)), page, pageSize);
  res.json(ok(result));
}));

// 订单详情
router.get("/:id", asyncHandler(async (req, res) => {
  const order = store.get("orders", req.params.id);
  if (!order || order.userId !== req.user.id) return fail(404, 404, "订单不存在");
  res.json(ok(serializeOrder(order, req.query.currency)));
}));

// 取消订单
router.post("/:id/cancel", asyncHandler(async (req, res) => {
  const order = store.get("orders", req.params.id);
  if (!order || order.userId !== req.user.id) return fail(404, 404, "订单不存在");
  if (order.status !== "pending_payment") return fail(400, 400, "当前状态不可取消");
  // 回补库存
  store.find("orderItems", (i) => i.orderId === order.id).forEach((it) => {
    const sku = store.get("productSkus", it.skuId);
    if (sku) store.update("productSkus", sku.id, { stock: sku.stock + it.quantity });
    const p = store.get("products", it.productId);
    if (p) store.update("products", p.id, { stock: p.stock + it.quantity });
  });
  // 退回优惠券
  if (order.couponId) {
    const uc = store.findOne("userCoupons", (c) => c.couponId === order.couponId && c.userId === req.user.id && c.status === "used" && c.orderId === order.id);
    if (uc) store.update("userCoupons", uc.id, { status: "unused", usedAt: null, orderId: null });
  }
  store.update("orders", order.id, { status: "cancelled" });
  notify(req, req.user.id, "订单已取消", `订单 ${order.orderNo} 已取消`);
  res.json(ok(serializeOrder(store.get("orders", order.id))));
}));


// 发起支付（生产环境：调用微信/支付宝统一下单，返回支付参数；沙箱返回 mock 二维码）
router.post("/:id/pay", asyncHandler(async (req, res) => {
  const order = store.get("orders", req.params.id);
  if (!order || order.userId !== req.user.id) return fail(404, 404, "订单不存在");
  if (order.status !== "pending_payment") return fail(400, 400, "订单状态不支持支付");
  const method = ["wechat", "alipay"].includes(req.body.method) ? req.body.method : "wechat";
  // 支付风控：大额支付触发人工审核标记
  if (order.payableAmount >= 500000) {
    store.insert("riskEvents", { userId: req.user.id, type: "pay_risk", level: "medium", detail: { reason: "大额支付 " + (order.payableAmount / 100).toFixed(2) + " 元", orderId: order.id }, ip: req.ip, createdAt: now() });
  }
  const payment = store.insert("payments", {
    orderId: order.id,
    userId: req.user.id,
    method,
    amount: order.payableAmount,
    currency: order.currency,
    status: "pending",
    transactionNo: null,
    createdAt: now(),
    paidAt: null,
  });
  store.update("orders", order.id, { paymentMethod: method });
  res.json(ok({
    paymentId: payment.id,
    method,
    amount: order.payableAmount,
    currency: order.currency,
    status: "pending",
    qrCodeUrl: "mock://pay/" + payment.id + "?amount=" + order.payableAmount + "&method=" + method,
    sandbox: true,
  }));
}));

// 确认收货
router.post("/:id/confirm", asyncHandler(async (req, res) => {
  const order = store.get("orders", req.params.id);
  if (!order || order.userId !== req.user.id) return fail(404, 404, "订单不存在");
  if (order.status !== "shipped") return fail(400, 400, "当前状态不可确认收货");
  store.update("orders", order.id, { status: "completed", completedAt: now() });
  // 返积分：1 元 = 1 积分
  const points = Math.floor(order.payableAmount / 100);
  store.update("users", req.user.id, { points: (req.user.points || 0) + points });
  store.insert("pointsLogs", { userId: req.user.id, points, reason: `订单 ${order.orderNo} 完成返积分`, refId: order.id, createdAt: now() });
  notify(req, req.user.id, "交易完成", `订单 ${order.orderNo} 已确认收货，获得 ${points} 积分`);
  res.json(ok(serializeOrder(store.get("orders", order.id))));
}));

// 申请售后（退款/退货退款）
router.post("/:id/apply-refund", asyncHandler(async (req, res) => {
  const order = store.get("orders", req.params.id);
  if (!order || order.userId !== req.user.id) return fail(404, 404, "订单不存在");
  if (!["paid", "shipped", "completed"].includes(order.status)) return fail(400, 400, "当前状态不可申请售后");
  if (store.findOne("aftersales", (a) => a.orderId === order.id && a.status === "pending")) return fail(400, 400, "已有进行中的售后单");
  const reason = String(req.body.reason || "不想要了").slice(0, 200);
  const aftersale = store.insert("aftersales", {
    orderId: order.id,
    userId: req.user.id,
    type: req.body.type === "return_refund" ? "return_refund" : "refund",
    reason,
    amount: order.payableAmount,
    status: "pending",
    merchantNote: null,
  });
  store.update("orders", order.id, { status: "refunding" });
  notify(req, req.user.id, "售后申请已提交", `订单 ${order.orderNo} 的售后申请已提交，等待商家处理`);
  res.json(ok({ aftersale, order: serializeOrder(store.get("orders", order.id)) }));
}));

// 物流轨迹
router.get("/:id/track", asyncHandler(async (req, res) => {
  const order = store.get("orders", req.params.id);
  if (!order || order.userId !== req.user.id) return fail(404, 404, "订单不存在");
  const track = store.findOne("logistics", (l) => l.orderId === order.id);
  if (!track) return fail(404, 404, "暂无物流信息");
  res.json(ok({ carrier: track.carrier, trackingNo: track.trackingNo, status: track.status, events: track.events || [] }));
}));

export default router;