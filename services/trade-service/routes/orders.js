import { Router } from "express";
import store from "../../_shared/store.js";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok, fail, paginate, orderNo, now } from "../../_shared/util.js";
import { callInternal } from "../../_shared/internal-client.js";
import { publish, publishToUser } from "../../_shared/publisher.js";
import { serializeOrder, ensureRates, effectiveUnitPrice } from "./common.js";

const router = Router();
router.use(auth());

// 下单（购物车 -> 订单，按商家拆单；跨域数据全部经内部接口）
router.post("/", asyncHandler(async (req, res) => {
  const { cartItemIds, addressId, couponId, remark, currency } = req.body || {};
  let address = null;
  if (addressId) {
    address = await callInternal("auth", "GET", "/internal/addresses/" + req.user.id + "/" + addressId).catch(() => null);
  } else if (req.body.address && req.body.address.name && req.body.address.phone && req.body.address.detail) {
    const a = req.body.address;
    address = { name: a.name, phone: a.phone, province: a.province || "", city: a.city || "", district: a.district || "", detail: a.detail };
  }
  if (!address) return fail(400, 400, "请选择有效的收货地址");

  // 购物车（cart 服务）
  const cart = await callInternal("cart", "GET", "/internal/cart/" + req.user.id).catch(() => ({ items: [] }));
  let picked = (cart.items || []).filter((i) => (cartItemIds && cartItemIds.length ? cartItemIds.map(Number).includes(i.id) : i.checked));
  if (!picked.length) return fail(400, 400, "请选择要结算的商品");

  // 商品/SKU 快照（catalog 服务，含阶梯价）
  const prodIds = [...new Set(picked.map((i) => i.productId).filter(Boolean))];
  const batch = await callInternal("catalog", "GET", "/internal/products/batch", null, { ids: prodIds.join(",") }).catch(() => ({ list: [] }));
  const prodMap = {};
  (batch.list || []).forEach((full) => { if (full && full.product) prodMap[full.product.id] = full; });
  const skuOf = (skuId) => {
    for (const full of Object.values(prodMap)) {
      const s = (full.skus || []).find((x) => Number(x.id) === Number(skuId));
      if (s) return s;
    }
    return null;
  };

  // 库存校验
  for (const it of picked) {
    const sku = skuOf(it.skuId);
    if (!sku || sku.stock < it.quantity) return fail(400, 400, "「" + (it.productName || "商品") + "」库存不足");
  }

  // 用户（auth 服务：新鲜 customerType/积分）
  const freshUser = await callInternal("auth", "GET", "/internal/users/" + req.user.id).catch(() => null);
  const buyer = freshUser || req.user;

  // 优惠券校验（marketing 服务）
  let coupon = null;
  let uc = null;
  if (couponId) {
    uc = await callInternal("marketing", "GET", "/internal/user-coupons/find", null, { id: couponId, userId: req.user.id, status: "unused" }).catch(() => null);
    if (!uc) return fail(400, 400, "优惠券不可用");
    coupon = await callInternal("marketing", "GET", "/internal/coupons/" + uc.couponId).catch(() => null);
    if (!coupon) return fail(400, 400, "优惠券不可用");
    const nowT = Date.now();
    if (new Date(coupon.startAt) > nowT || new Date(coupon.endAt) < nowT) return fail(400, 400, "优惠券不在有效期内");
  }

  // 按商家分组
  const byMerchant = {};
  for (const it of picked) {
    const full = prodMap[it.productId] || {};
    const mid = full.product ? full.product.merchantId : 1;
    (byMerchant[mid] ||= []).push(it);
  }

  const createdOrders = [];
  let couponApplied = false;
  for (const [mid, items] of Object.entries(byMerchant)) {
    // CNY 金额（B2B：批发客户按阶梯价）
    const cnyTotal = items.reduce((s, i) => {
      const full = prodMap[i.productId] || {};
      const sku = skuOf(i.skuId);
      const unit = effectiveUnitPrice(full.product || null, sku, i.quantity, buyer);
      return s + unit * i.quantity;
    }, 0);
    let discount = 0;
    let usedCoupon = null;
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
      address: { name: address.name, phone: address.phone, province: address.province || "", city: address.city || "", district: address.district || "", detail: address.detail, addressLabel: (address.province || "") + " " + (address.city || "") + " " + (address.district || "") + " " + address.detail },
      remark: remark || "",
      paidAt: null, shippedAt: null, completedAt: null,
    });
    items.forEach((it, idx) => {
      const full = prodMap[it.productId] || {};
      const sku = skuOf(it.skuId);
      const unit = effectiveUnitPrice(full.product || null, sku, it.quantity, buyer);
      store.insert("orderItems", {
        orderId: order.id,
        productId: it.productId,
        skuId: it.skuId,
        productName: it.productName,
        skuName: it.skuName,
        image: it.image,
        price: unit,
        quantity: it.quantity,
        subtotal: unit * it.quantity,
      });
      // 扣库存（catalog；SKU 库存联动商品总库存）
      if (sku) {
        callInternal("catalog", "POST", "/internal/skus/" + sku.id + "/stock", { delta: -it.quantity }).catch(() => {});
      }
    });
    createdOrders.push(order);
  }

  // 删除已购购物车项（cart 服务）
  await callInternal("cart", "POST", "/internal/cart/" + req.user.id + "/remove", { ids: picked.map((i) => i.id) }).catch(() => {});

  // 优惠券标记已使用（marketing）
  if (couponApplied && uc) {
    await callInternal("marketing", "PUT", "/internal/user-coupons/" + uc.id + "/use", { orderId: createdOrders[0].id }).catch(() => {});
  }

  // 实时推送：购物车角标 + 通知 + 看板
  const cart2 = await callInternal("cart", "GET", "/internal/cart/" + req.user.id).catch(() => ({ items: [], totalQuantity: 0 }));
  await publishToUser(req.user.id, { type: "cart:changed", data: { totalQuantity: cart2.totalQuantity || 0, updatedAt: now() } });
  await publishToUser(req.user.id, { type: "notify", data: { title: "下单成功", body: "已生成 " + createdOrders.length + " 笔订单，请尽快完成支付" } });
  await publish("dashboard", { type: "dashboard:changed", data: { action: "order.created", count: createdOrders.length, ts: new Date().toISOString() } });
  if (currency && currency !== "CNY") await ensureRates();
  res.json(ok({ orders: createdOrders.map((o) => serializeOrder(o, currency)) }));
}));

// 订单列表
router.get("/", asyncHandler(async (req, res) => {
  const { status, page, pageSize, currency } = req.query;
  let list = store.find("orders", (o) => o.userId === req.user.id);
  if (status) list = list.filter((o) => o.status === status);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (currency && currency !== "CNY") await ensureRates();
  const result = paginate(list.map((o) => serializeOrder(o, currency)), page, pageSize);
  res.json(ok(result));
}));

// 订单详情
router.get("/:id", asyncHandler(async (req, res) => {
  const order = store.get("orders", req.params.id);
  if (!order || order.userId !== req.user.id) return fail(404, 404, "订单不存在");
  if (req.query.currency && req.query.currency !== "CNY") await ensureRates();
  res.json(ok(serializeOrder(order, req.query.currency)));
}));

// 取消订单（回补库存/退回优惠券）
router.post("/:id/cancel", asyncHandler(async (req, res) => {
  const order = store.get("orders", req.params.id);
  if (!order || order.userId !== req.user.id) return fail(404, 404, "订单不存在");
  if (order.status !== "pending_payment") return fail(400, 400, "当前状态不可取消");
  // 回补库存（catalog）
  store.find("orderItems", (i) => i.orderId === order.id).forEach((it) => {
    callInternal("catalog", "POST", "/internal/skus/" + it.skuId + "/stock", { delta: it.quantity }).catch(() => {});
  });
  // 退回优惠券（marketing）
  if (order.couponId) {
    const uc = await callInternal("marketing", "GET", "/internal/user-coupons/find", null, { id: order.couponId, userId: req.user.id, status: "used" }).catch(() => null);
    if (uc && uc.orderId === order.id) {
      await callInternal("marketing", "PUT", "/internal/user-coupons/" + uc.id + "/return").catch(() => {});
    }
  }
  store.update("orders", order.id, { status: "cancelled", cancelledAt: now() });
  await publishToUser(req.user.id, { type: "notify", data: { title: "订单已取消", body: "订单 " + order.orderNo + " 已取消" } });
  res.json(ok(serializeOrder(store.get("orders", order.id))));
}));

// 发起支付（沙箱 mock 二维码）
router.post("/:id/pay", asyncHandler(async (req, res) => {
  const order = store.get("orders", req.params.id);
  if (!order || order.userId !== req.user.id) return fail(404, 404, "订单不存在");
  if (order.status !== "pending_payment") return fail(400, 400, "订单状态不支持支付");
  const method = ["wechat", "alipay"].includes(req.body.method) ? req.body.method : "wechat";
  // 支付风控：大额支付触发人工审核标记（platform）
  if (order.payableAmount >= 500000) {
    callInternal("platform", "POST", "/internal/risk-events", { userId: req.user.id, type: "pay_risk", level: "medium", detail: { reason: "大额支付 " + (order.payableAmount / 100).toFixed(2) + " 元", orderId: order.id }, ip: req.ip, createdAt: now() }).catch(() => {});
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

// 确认收货（返积分）
router.post("/:id/confirm", asyncHandler(async (req, res) => {
  const order = store.get("orders", req.params.id);
  if (!order || order.userId !== req.user.id) return fail(404, 404, "订单不存在");
  if (order.status !== "shipped") return fail(400, 400, "当前状态不可确认收货");
  store.update("orders", order.id, { status: "completed", completedAt: now() });
  // 返积分：1 元 = 1 积分（auth 余额 + marketing 流水）
  const points = Math.floor(order.payableAmount / 100);
  await callInternal("auth", "PUT", "/internal/users/" + req.user.id + "/points", { delta: points }).catch(() => {});
  await callInternal("marketing", "POST", "/internal/points/logs", { userId: req.user.id, points, reason: "订单 " + order.orderNo + " 完成返积分", refId: order.id }).catch(() => {});
  await publishToUser(req.user.id, { type: "notify", data: { title: "交易完成", body: "订单 " + order.orderNo + " 已确认收货，获得 " + points + " 积分" } });
  res.json(ok(serializeOrder(store.get("orders", order.id))));
}));

// 申请售后
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
  await publishToUser(req.user.id, { type: "notify", data: { title: "售后申请已提交", body: "订单 " + order.orderNo + " 的售后申请已提交，等待商家处理" } });
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