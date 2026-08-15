import { hashPassword, now, orderNo, uid } from "./util.js";

// ============ 演示种子数据（dev/demo 模式） ============
export function seedData() {
  const ts = now();
  const img = (seed) => `https://picsum.photos/seed/${seed}/600/600`;
  const daysAgo = (d, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000).toISOString();
  const daysAhead = (d, h = 0) => new Date(Date.now() + d * 86400000 + h * 3600000).toISOString();

  // ---------- 用户 ----------
  const pwd = {
    admin: hashPassword("admin123"),
    merchant: hashPassword("merchant123"),
    user: hashPassword("user123"),
  };
  const users = [
    { id: 1, phone: "13800000001", nickname: "admin", avatar: img("u1"), password: pwd.admin, role: "admin", merchantId: null, points: 0, status: "active", createdAt: daysAgo(90) },
    { id: 2, phone: "13800000002", nickname: "merchant", avatar: img("u2"), password: pwd.merchant, role: "merchant", merchantId: 1, points: 0, status: "active", createdAt: daysAgo(80) },
    { id: 3, phone: "13800000003", nickname: "user", avatar: img("u3"), password: pwd.user, role: "user", merchantId: null, points: 1280, status: "active", createdAt: daysAgo(60) },
    { id: 4, phone: "13800000004", nickname: "阿杰", avatar: img("u4"), password: pwd.user, role: "user", merchantId: null, points: 350, customerType: "wholesale", status: "active", createdAt: daysAgo(30) },
    { id: 5, phone: "13800000005", nickname: "小雨", avatar: img("u5"), password: pwd.user, role: "user", merchantId: null, points: 0, status: "active", createdAt: daysAgo(10) },
    { id: 6, phone: "13800000006", nickname: "南风时装", avatar: img("u6"), password: pwd.merchant, role: "merchant", merchantId: 2, points: 0, status: "active", createdAt: daysAgo(50) },
    { id: 7, phone: "13800000007", nickname: "鲜味食集", avatar: img("u7"), password: pwd.merchant, role: "merchant", merchantId: 3, points: 0, status: "active", createdAt: daysAgo(40) },
  ];

  // ---------- 地址 ----------
  const addresses = [
    { id: 1, userId: 3, name: "小美", phone: "13800000003", province: "广东省", city: "深圳市", district: "南山区", detail: "科技园路 1 号 801 室", isDefault: true, createdAt: daysAgo(50) },
    { id: 2, userId: 3, name: "小美", phone: "13800000003", province: "广东省", city: "广州市", district: "天河区", detail: "体育西路 100 号", isDefault: false, createdAt: daysAgo(20) },
    { id: 3, userId: 4, name: "阿杰", phone: "13800000004", province: "上海市", city: "上海市", district: "浦东新区", detail: "世纪大道 88 号", isDefault: true, createdAt: daysAgo(25) },
    { id: 4, userId: 5, name: "小雨", phone: "13800000005", province: "北京市", city: "北京市", district: "朝阳区", detail: "建国路 93 号", isDefault: true, createdAt: daysAgo(5) },
  ];

  // ---------- 商家 ----------
  const merchants = [
    { id: 1, userId: 2, name: "星辰数码旗舰店", logo: img("m1"), description: "3C 数码官方旗舰，正品保障，全国联保", contactName: "王经理", contactPhone: "13900000001", rating: 4.8, status: "approved", createdAt: daysAgo(80) },
    { id: 2, userId: 6, name: "南风时装", logo: img("m2"), description: "快时尚服饰，支持虚拟试衣", contactName: "李总", contactPhone: "13900000002", rating: 4.6, status: "approved", createdAt: daysAgo(50) },
    { id: 3, userId: 7, name: "鲜味食集", logo: img("m3"), description: "产地直供生鲜食品", contactName: "赵总", contactPhone: "13900000003", rating: 4.7, status: "approved", createdAt: daysAgo(40) },
    { id: 4, userId: null, name: "云裳女装", logo: img("m4"), description: "原创设计师女装品牌（待审核）", contactName: "陈女士", contactPhone: "13900000004", rating: 0, status: "pending", createdAt: daysAgo(3) },
  ];

  // ---------- 分类 ----------
  const categories = [
    { id: 1, parentId: 0, name: "手机数码", icon: "iphone", sort: 1 },
    { id: 2, parentId: 0, name: "服饰鞋包", icon: "shopping-bag", sort: 2 },
    { id: 3, parentId: 0, name: "美妆护肤", icon: "brush", sort: 3 },
    { id: 4, parentId: 0, name: "家居生活", icon: "house", sort: 4 },
    { id: 5, parentId: 0, name: "食品生鲜", icon: "apple", sort: 5 },
    { id: 6, parentId: 1, name: "手机", icon: "iphone", sort: 1 },
    { id: 7, parentId: 1, name: "耳机音箱", icon: "headset", sort: 2 },
    { id: 8, parentId: 2, name: "女装", icon: "shopping-bag", sort: 1 },
    { id: 9, parentId: 2, name: "男装", icon: "shopping-bag", sort: 2 },
    { id: 10, parentId: 3, name: "护肤", icon: "brush", sort: 1 },
    { id: 11, parentId: 4, name: "厨具", icon: "house", sort: 1 },
    { id: 12, parentId: 5, name: "零食", icon: "apple", sort: 1 },
  ];

  // ---------- 商品 ----------
  // def: [id, merchantId, categoryId, name, subtitle, price(分), original, stock, sales, tags, skus(name, price, stock)]
  const defs = [
    [101, 1, 6, "星耀 X1 智能手机 5G 全网通", "6.7 英寸 2K 屏 | 5000mAh 大电池 | 旗舰芯片", 299900, 329900, 500, 1200, ["热卖", "新品"], [["曜石黑 8+256G", 299900, 200], ["月光银 8+256G", 299900, 150], ["星光蓝 12+512G", 339900, 150]]],
    [102, 1, 6, "星耀 X1 Pro 智能手机", "双摄 1 亿像素 | 120W 快充", 399900, 429900, 300, 800, ["旗舰"], [["陶瓷黑 12+512G", 399900, 150], ["云白 12+512G", 399900, 150]]],
    [103, 1, 7, "AirBuds Pro 降噪耳机", "主动降噪 | 30 小时续航", 89900, 109900, 1000, 2300, ["热卖"], [["白色", 89900, 600], ["黑色", 89900, 400]]],
    [104, 1, 7, "便携蓝牙音箱 Mini", "IPX7 防水 | 户外必备", 19900, 25900, 800, 900, [], [["蓝色", 19900, 400], ["红色", 19900, 400]]],
    [105, 1, 7, "智能手表 S3", "心率血氧监测 | 14 天续航", 59900, 69900, 600, 1500, ["新品"], [["标准版", 59900, 300], ["运动版", 65900, 300]]],
    [106, 1, 6, "超薄充电宝 20000mAh", "22.5W 双向快充", 12900, 15900, 2000, 3200, [], [["黑色", 12900, 1000], ["白色", 12900, 1000]]],
    [201, 2, 8, "法式碎花连衣裙", "夏季新款 显瘦收腰 A 字裙", 25900, 32900, 400, 860, ["试衣", "热卖"], [["S 红色碎花", 25900, 100], ["M 红色碎花", 25900, 120], ["L 红色碎花", 25900, 100], ["XL 红色碎花", 25900, 80]]],
    [202, 2, 8, "纯棉宽松 T 恤", "百搭基础款 男女同款", 7900, 9900, 1500, 2600, ["试衣"], [["S 白色", 7900, 300], ["M 白色", 7900, 400], ["L 黑色", 7900, 400], ["XL 黑色", 7900, 400]]],
    [203, 2, 9, "商务休闲衬衫", "免烫抗皱 通勤必备", 15900, 19900, 700, 1200, [], [["M 浅蓝", 15900, 200], ["L 浅蓝", 15900, 200], ["XL 浅蓝", 15900, 150], ["XXL 藏青", 16900, 150]]],
    [204, 2, 8, "高腰阔腿牛仔裤", "显高显瘦 弹力面料", 18900, 23900, 500, 980, ["试衣"], [["S 浅蓝", 18900, 120], ["M 浅蓝", 18900, 140], ["L 深蓝", 18900, 120], ["XL 深蓝", 18900, 120]]],
    [205, 2, 9, "轻量冲锋衣 三合一", "防风防水 可拆卸内胆", 39900, 49900, 300, 640, [], [["M 黑", 39900, 100], ["L 黑", 39900, 100], ["XL 军绿", 39900, 100]]],
    [301, 3, 10, "烟酰胺焕亮精华 30ml", "提亮肤色 淡化痘印", 16900, 21900, 900, 1700, ["热卖"], [["30ml", 16900, 500], ["50ml", 23900, 400]]],
    [302, 3, 10, "氨基酸温和洁面乳", "敏感肌可用 绵密泡沫", 4900, 6900, 2000, 3500, [], [["100g", 4900, 1000], ["200g", 7900, 1000]]],
    [303, 3, 10, "玻尿酸补水面膜 20 片", "深层补水 敷出水光肌", 7900, 9900, 1500, 2800, [], [["20 片装", 7900, 1500]]],
    [401, 4, 11, "多功能料理锅", "煎烤涮一体 3L 大容量", 29900, 39900, 350, 720, ["新品"], [["标配款", 29900, 200], ["高配款", 35900, 150]]],
    [402, 4, 11, "陶瓷刀具 6 件套", "锋利耐用 一体成型", 15900, 19900, 800, 1100, [], [["6 件套", 15900, 800]]],
    [403, 4, 11, "北欧风四件套床品", "60 支长绒棉 裸睡级", 39900, 49900, 260, 540, [], [["1.5m 床 灰", 39900, 130], ["1.8m 床 灰", 43900, 130]]],
    [501, 3, 12, "每日坚果 30 包", "混合坚果 独立小包装", 11900, 14900, 1200, 2400, ["热卖"], [["30 包", 11900, 1200]]],
    [502, 3, 12, "进口黑巧克力礼盒", "72% 可可 浓醇丝滑", 9900, 12900, 900, 1500, [], [["礼盒装 12 颗", 9900, 900]]],
    [503, 3, 12, "冷萃冻干咖啡 24 颗", "3 秒速溶 精品咖啡豆", 8900, 10900, 1000, 1800, ["新品"], [["24 颗装", 8900, 1000]]],
    [504, 1, 7, "高清网络摄像头", "1080P 自动对焦 直播/网课", 19900, 24900, 500, 600, ["直播"], [["1080P", 19900, 500]]],
    [505, 1, 7, "专业直播补光灯", "环形美颜灯 三色温 可调", 12900, 16900, 600, 700, ["直播"], [["10 寸", 12900, 600]]],
  ];

  const products = [];
  const productSkus = [];
  let skuId = 1;
  defs.forEach((d) => {
    const [id, merchantId, categoryId, name, subtitle, price, original, stock, sales, tags, skus] = d;
    products.push({
      id, merchantId, categoryId, name, subtitle,
      description: `这是「${name}」的商品详情。${subtitle}。多端电商系统演示商品，支持 SKU 选择、购物车实时同步、下单支付全流程。`,
      mainImage: img("p" + id),
      images: [img("p" + id + "a"), img("p" + id + "b"), img("p" + id + "c")],
      price, originalPrice: original, stock, sales,
      tags, rating: Number((4.2 + ((id * 7) % 8) / 10).toFixed(1)),
      status: "on", isFlash: false, flashPrice: null,
      wholesaleTiers: [101, 103, 201, 301, 501].includes(id)
        ? [
            { minQuantity: 2, price: Math.round(price * 0.92) },
            { minQuantity: 5, price: Math.round(price * 0.85) },
            { minQuantity: 20, price: Math.round(price * 0.78) },
          ]
        : null,
      createdAt: daysAgo(20 + (id % 40)), updatedAt: ts,
    });
    skus.forEach(([sname, sprice, sstock]) => {
      productSkus.push({ id: skuId++, productId: id, name: sname, specValues: sname.split(" "), price: sprice, stock: sstock, code: "SKU" + String(id).slice(-3) + skuId });
    });
  });

  // ---------- 优惠券 ----------
  const coupons = [
    { id: 1, merchantId: null, name: "新人专享 满 100 减 10", type: "full_reduction", threshold: 10000, value: 1000, total: 10000, claimed: 120, perUser: 1, startAt: daysAgo(10), endAt: daysAhead(20), status: "active" },
    { id: 2, merchantId: null, name: "全场 满 200 减 30", type: "full_reduction", threshold: 20000, value: 3000, total: 5000, claimed: 340, perUser: 1, startAt: daysAgo(10), endAt: daysAhead(15), status: "active" },
    { id: 3, merchantId: 1, name: "数码专享 8.8 折券", type: "discount", threshold: 50000, value: 88, total: 2000, claimed: 90, perUser: 1, startAt: daysAgo(5), endAt: daysAhead(10), status: "active" },
    { id: 4, merchantId: 2, name: "服饰专享 满 150 减 20", type: "full_reduction", threshold: 15000, value: 2000, total: 3000, claimed: 210, perUser: 1, startAt: daysAgo(5), endAt: daysAhead(10), status: "active" },
  ];
  const userCoupons = [
    { id: 1, userId: 3, couponId: 1, status: "unused", claimedAt: daysAgo(3), usedAt: null, orderId: null },
    { id: 2, userId: 3, couponId: 2, status: "unused", claimedAt: daysAgo(2), usedAt: null, orderId: null },
    { id: 3, userId: 4, couponId: 1, status: "used", claimedAt: daysAgo(20), usedAt: daysAgo(10), orderId: 9002 },
  ];

  // ---------- 秒杀 ----------
  const flashSales = [
    { id: 1, productId: 103, skuId: 6, flashPrice: 59900, quota: 50, sold: 23, startAt: daysAgo(1), endAt: daysAhead(2), status: "active" },
    { id: 2, productId: 201, skuId: 8, flashPrice: 15900, quota: 80, sold: 41, startAt: daysAgo(1), endAt: daysAhead(1), status: "active" },
    { id: 3, productId: 501, skuId: 30, flashPrice: 7900, quota: 100, sold: 12, startAt: daysAhead(1), endAt: daysAhead(3), status: "scheduled" },
  ];

  // ---------- 订单（演示数据） ----------
  const mkOrderItems = (orderId, items) => items.map((it, i) => ({ id: orderId * 100 + i + 1, orderId, ...it }));
  const orders = [
    { id: 9001, orderNo: "ORD" + orderNo(), userId: 3, merchantId: 1, status: "completed", totalAmount: 309800, discountAmount: 1000, couponId: 1, couponAmount: 1000, payableAmount: 308800, currency: "CNY", paymentMethod: "wechat", address: { name: "小美", phone: "13800000003", detail: "广东省 深圳市 南山区 科技园路 1 号 801 室" }, remark: "", paidAt: daysAgo(12), shippedAt: daysAgo(11), completedAt: daysAgo(9), createdAt: daysAgo(12) },
    { id: 9002, orderNo: "ORD" + orderNo(), userId: 4, merchantId: 2, status: "completed", totalAmount: 44800, discountAmount: 0, couponId: 2, couponAmount: 3000, payableAmount: 41800, currency: "CNY", paymentMethod: "alipay", address: { name: "阿杰", phone: "13800000004", detail: "上海市 上海市 浦东新区 世纪大道 88 号" }, remark: "", paidAt: daysAgo(10), shippedAt: daysAgo(9), completedAt: daysAgo(7), createdAt: daysAgo(10) },
    { id: 9003, orderNo: "ORD" + orderNo(), userId: 3, merchantId: 2, status: "paid", totalAmount: 51800, discountAmount: 0, couponId: null, couponAmount: 0, payableAmount: 51800, currency: "CNY", paymentMethod: "wechat", address: { name: "小美", phone: "13800000003", detail: "广东省 深圳市 南山区 科技园路 1 号 801 室" }, remark: "请放快递柜", paidAt: daysAgo(1), shippedAt: null, completedAt: null, createdAt: daysAgo(1) },
  ];
  const orderItems = [
    ...mkOrderItems(9001, [
      { productId: 101, skuId: 1, productName: "星耀 X1 智能手机 5G 全网通", skuName: "曜石黑 8+256G", image: img("p101"), price: 299900, quantity: 1, subtotal: 299900 },
      { productId: 106, skuId: 21, productName: "超薄充电宝 20000mAh", skuName: "黑色", image: img("p106"), price: 12900, quantity: 1, subtotal: 12900 },
    ]),
    ...mkOrderItems(9002, [
      { productId: 201, skuId: 8, productName: "法式碎花连衣裙", skuName: "M 红色碎花", image: img("p201"), price: 25900, quantity: 2, subtotal: 51800 },
    ]),
    ...mkOrderItems(9003, [
      { productId: 204, skuId: 18, productName: "高腰阔腿牛仔裤", skuName: "L 深蓝", image: img("p204"), price: 18900, quantity: 1, subtotal: 18900 },
      { productId: 301, skuId: 24, productName: "烟酰胺焕亮精华 30ml", skuName: "30ml", image: img("p301"), price: 16900, quantity: 1, subtotal: 16900 },
      { productId: 303, skuId: 28, productName: "玻尿酸补水面膜 20 片", skuName: "20 片装", image: img("p303"), price: 7900, quantity: 2, subtotal: 15800 },
    ]),
  ];

  const payments = [
    { id: 1, orderId: 9001, userId: 3, method: "wechat", amount: 308800, currency: "CNY", status: "success", transactionNo: "wx" + uid(18), createdAt: daysAgo(12), paidAt: daysAgo(12) },
    { id: 2, orderId: 9002, userId: 4, method: "alipay", amount: 41800, currency: "CNY", status: "success", transactionNo: "ali" + uid(18), createdAt: daysAgo(10), paidAt: daysAgo(10) },
    { id: 3, orderId: 9003, userId: 3, method: "wechat", amount: 51800, currency: "CNY", status: "success", transactionNo: "wx" + uid(18), createdAt: daysAgo(1), paidAt: daysAgo(1) },
  ];

  const logistics = [
    { id: 1, orderId: 9001, carrier: "顺丰速运", trackingNo: "SF" + uid(12).toUpperCase(), status: "delivered", events: [
      { time: daysAgo(11, 2), text: "【深圳市】快件已从【南山集散中心】发出" },
      { time: daysAgo(10, 5), text: "【深圳市】快件已到达【科技园派送点】" },
      { time: daysAgo(9, 3), text: "【深圳市】快件已签收，签收人：本人" },
    ], shippedAt: daysAgo(11) },
    { id: 2, orderId: 9002, carrier: "中通快递", trackingNo: "ZT" + uid(12).toUpperCase(), status: "delivered", events: [
      { time: daysAgo(9, 1), text: "【上海市】快件已签收" },
    ], shippedAt: daysAgo(9) },
  ];

  const aftersales = [];

  // ---------- 分享 ----------
  const shares = [
    { id: 1, code: "SHARE" + uid(8).toUpperCase(), userId: 3, type: "product", refId: 101, clicks: 26, createdAt: daysAgo(4) },
  ];

  // ---------- 积分流水 ----------
  const pointsLogs = [
    { id: 1, userId: 3, points: 3088, reason: "订单 9001 完成返积分", refId: 9001, createdAt: daysAgo(9) },
    { id: 2, userId: 4, points: 418, reason: "订单 9002 完成返积分", refId: 9002, createdAt: daysAgo(7) },
    { id: 3, userId: 3, points: 518, reason: "订单 9003 支付返积分", refId: 9003, createdAt: daysAgo(1) },
    { id: 4, userId: 3, points: -200, reason: "积分商城兑换", refId: null, createdAt: daysAgo(5) },
  ];

  // ---------- CMS ----------
  const cmsPages = [
    { id: 1, key: "home", title: "首页", status: "published", updatedBy: 1, updatedAt: daysAgo(2), blocks: [
      { type: "banner", props: { images: [img("b1"), img("b2"), img("b3")] } },
      { type: "nav", props: { items: [{ text: "手机数码", categoryId: 1 }, { text: "服饰鞋包", categoryId: 2 }, { text: "美妆护肤", categoryId: 3 }, { text: "家居生活", categoryId: 4 }, { text: "食品生鲜", categoryId: 5 }] } },
      { type: "notice", props: { text: "🎉 新人注册领 10 元无门槛券，全场满 200 减 30！" } },
      { type: "goods", props: { title: "今日热卖", productIds: [101, 103, 201, 301, 501, 401] } },
      { type: "rich", props: { html: "<h3>品质生活节</h3><p>精选好物 5 折起，下单即返积分。</p>" } },
    ] },
    { id: 2, key: "flashsale", title: "秒杀专场", status: "published", updatedBy: 1, updatedAt: daysAgo(1), blocks: [
      { type: "notice", props: { text: "⚡ 限时秒杀，手慢无！" } },
      { type: "goods", props: { title: "正在秒杀", productIds: [103, 201, 501] } },
    ] },
  ];
  const cmsTemplates = [
    { id: 1, name: "基础首页模板", content: { blocks: [{ type: "banner", props: { images: [] } }, { type: "nav", props: { items: [] } }, { type: "goods", props: { title: "推荐商品", productIds: [] } }] } },
    { id: 2, name: "活动落地页模板", content: { blocks: [{ type: "notice", props: { text: "" } }, { type: "image", props: { url: "" } }, { type: "goods", props: { title: "活动商品", productIds: [] } }] } },
  ];

  // ---------- 多语言 / 多货币 ----------
  const currencies = [
    { code: "CNY", name: "人民币", symbol: "¥", rate: 1, isDefault: true, status: "active" },
    { code: "USD", name: "美元", symbol: "$", rate: 0.14, isDefault: false, status: "active" },
    { code: "EUR", name: "欧元", symbol: "€", rate: 0.13, isDefault: false, status: "active" },
    { code: "HKD", name: "港币", symbol: "HK$", rate: 1.09, isDefault: false, status: "active" },
    { code: "JPY", name: "日元", symbol: "¥", rate: 21.5, isDefault: false, status: "active" },
    { code: "GBP", name: "英镑", symbol: "£", rate: 0.11, isDefault: false, status: "active" },
  ];

  const t = (obj) => obj;
  const translations = [
    { lang: "zh-CN", data: t({ home: "首页", categories: "分类", cart: "购物车", mine: "我的", search: "搜索", login: "登录", register: "注册", logout: "退出登录", addToCart: "加入购物车", buyNow: "立即购买", checkout: "去结算", pay: "去支付", paySuccess: "支付成功", orders: "我的订单", allOrders: "全部订单", pendingPayment: "待付款", toShip: "待发货", toReceive: "待收货", completed: "已完成", coupons: "优惠券", points: "积分", flashSale: "限时秒杀", live: "直播", fitting: "虚拟试衣", settings: "设置", language: "语言", currency: "币种", total: "合计", submitOrder: "提交订单", selectCoupon: "选择优惠券", noCoupon: "不使用优惠券", address: "收货地址", addAddress: "新增地址", confirm: "确认", cancel: "取消", stock: "库存", sales: "销量", detail: "商品详情", recommend: "为你推荐", share: "分享", like: "点赞", chat: "聊天", product: "商品", backHome: "回首页" }) },
    { lang: "en-US", data: t({ home: "Home", categories: "Categories", cart: "Cart", mine: "Me", search: "Search", login: "Login", register: "Register", logout: "Logout", addToCart: "Add to Cart", buyNow: "Buy Now", checkout: "Checkout", pay: "Pay Now", paySuccess: "Payment Success", orders: "My Orders", allOrders: "All", pendingPayment: "To Pay", toShip: "To Ship", toReceive: "To Receive", completed: "Completed", coupons: "Coupons", points: "Points", flashSale: "Flash Sale", live: "Live", fitting: "Virtual Try-on", settings: "Settings", language: "Language", currency: "Currency", total: "Total", submitOrder: "Place Order", selectCoupon: "Coupon", noCoupon: "No coupon", address: "Address", addAddress: "New Address", confirm: "OK", cancel: "Cancel", stock: "Stock", sales: "Sales", detail: "Details", recommend: "For You", share: "Share", like: "Like", chat: "Chat", product: "Products", backHome: "Home" }) },
  ];

  // ---------- 直播 ----------
  const liveRooms = [
    { id: 1, merchantId: 1, title: "星辰数码 618 狂欢夜", cover: img("live1"), status: "live", viewerCount: 1234, likeCount: 5678, productIds: [101, 102, 103, 105], streamUrl: "https://demo.example.com/live/1/index.m3u8", startedAt: daysAgo(0, 2) },
    { id: 2, merchantId: 2, title: "南风时装 新品试穿秀", cover: img("live2"), status: "live", viewerCount: 856, likeCount: 3200, productIds: [201, 202, 204, 205], streamUrl: "https://demo.example.com/live/2/index.m3u8", startedAt: daysAgo(0, 1) },
    { id: 3, merchantId: 3, title: "鲜味食集 产地直采", cover: img("live3"), status: "off", viewerCount: 0, likeCount: 0, productIds: [501, 502, 503], streamUrl: "", startedAt: null },
  ];
  const liveMessages = [
    { id: 1, roomId: 1, userId: 3, type: "chat", content: "主播，X1 有 8+256 吗？", createdAt: daysAgo(0, 1) },
    { id: 2, roomId: 1, userId: 5, type: "chat", content: "耳机降噪效果怎么样？", createdAt: daysAgo(0, 1) },
  ];

  // ---------- 虚拟试衣 ----------
  const fittingGarments = [
    { id: 1, productId: 201, modelUrl: "https://demo.example.com/models/dress-201.glb", sizeChart: [
      { size: "S", bust: 82, waist: 64, hip: 88, shoulder: 37 },
      { size: "M", bust: 86, waist: 68, hip: 92, shoulder: 38 },
      { size: "L", bust: 90, waist: 72, hip: 96, shoulder: 39 },
      { size: "XL", bust: 94, waist: 76, hip: 100, shoulder: 40 },
    ] },
    { id: 2, productId: 202, modelUrl: "https://demo.example.com/models/tee-202.glb", sizeChart: [
      { size: "S", bust: 88, waist: 70, hip: 90, shoulder: 40 },
      { size: "M", bust: 92, waist: 74, hip: 94, shoulder: 41 },
      { size: "L", bust: 96, waist: 78, hip: 98, shoulder: 42 },
      { size: "XL", bust: 100, waist: 82, hip: 102, shoulder: 43 },
    ] },
    { id: 3, productId: 204, modelUrl: "https://demo.example.com/models/jeans-204.glb", sizeChart: [
      { size: "S", bust: 80, waist: 62, hip: 86, shoulder: 36 },
      { size: "M", bust: 84, waist: 66, hip: 90, shoulder: 37 },
      { size: "L", bust: 88, waist: 70, hip: 94, shoulder: 38 },
      { size: "XL", bust: 92, waist: 74, hip: 98, shoulder: 39 },
    ] },
  ];
  const fittingSessions = [];

  // ---------- 风控 ----------
  const riskRules = [
    { id: 1, name: "登录频控", key: "login_rate", action: "limit", threshold: 20, windowSec: 60, enabled: true, description: "同一账号/IP 每分钟登录失败超过 20 次触发锁定" },
    { id: 2, name: "注册频控", key: "register_rate", action: "limit", threshold: 5, windowSec: 60, enabled: true, description: "同一 IP 每分钟注册超过 5 个账号" },
    { id: 3, name: "秒杀频控", key: "seckill_rate", action: "limit", threshold: 3, windowSec: 60, enabled: true, description: "同一用户每分钟秒杀请求超过 3 次" },
    { id: 4, name: "支付风控", key: "pay_risk", action: "review", threshold: 500000, windowSec: 0, enabled: true, description: "单笔支付金额超过 5000 元触发人工审核" },
    { id: 5, name: "优惠券防刷", key: "coupon_abuse", action: "block", threshold: 5, windowSec: 300, enabled: true, description: "同一用户 5 分钟内领券超过 5 张" },
  ];
  const riskEvents = [
    { id: 1, userId: null, type: "login_fail", level: "low", detail: { reason: "密码错误 3 次" }, ip: "127.0.0.1", createdAt: daysAgo(1) },
    { id: 2, userId: 3, type: "seckill", level: "medium", detail: { reason: "秒杀频率异常" }, ip: "127.0.0.1", createdAt: daysAgo(1) },
  ];

  const cartItems = [];

  return {
    users, addresses, categories, merchants, products, productSkus, cartItems,
    orders, orderItems, payments, logistics, aftersales,
    coupons, userCoupons, flashSales, shares, pointsLogs,
    cmsPages, cmsTemplates, translations, currencies,
    liveRooms, liveMessages, fittingGarments, fittingSessions,
    riskEvents, riskRules,
  };
}

// 允许命令行直接重建种子：node src/seed.js --force
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
if (process.argv.includes("--force")) {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const file = path.join(dir, "..", "data", "db.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(seedData(), null, 2));
  console.log("[seed] 已重建演示数据 ->", file);
}