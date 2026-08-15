# API 契约 v1（REST + WebSocket）

Base URL: `http://localhost:4000`  前缀: `/api/v1`
认证: `Authorization: Bearer <JWT>`（登录接口返回 token）。角色: `user`(买家) / `merchant`(商家) / `admin`(管理员)。
统一响应: `{ "code": 0, "data": ..., "message": "ok" }`；错误 `code != 0`，HTTP 状态码 400/401/403/404/500。
分页参数: `page`(默认1) `pageSize`(默认20)，返回 `{ list, total, page, pageSize }`。
价格字段单位为**分**（整数），另附 `currency` 字段；商品列表支持 `?currency=USD` 换算显示。

## 0. 种子账号
| 账号 | 密码 | 角色 |
|---|---|---|
| admin | admin123 | admin |
| merchant | merchant123 | merchant |
| user | user123 | user |

## 1. 认证 Auth
- `POST /auth/register` `{phone, password, nickname?, inviteCode?}` → `{token, user}`（inviteCode 绑定邀请人，被邀请人首单支付后邀请人得 200 积分奖励）
- `POST /auth/login` `{account, password}` → `{token, refreshToken, user}`（account 支持手机号或昵称）
- `POST /auth/wechat` `{code}` → mock 微信登录 → `{token, user}`
- `POST /auth/refresh` `{refreshToken}` → `{token}`
- `GET /auth/me` → `{id, nickname, avatar, phone, role, points, merchantId}`
- `PUT /auth/me` 更新昵称/头像

user 对象: `{id, nickname, avatar, phone, role, points, customerType: retail|wholesale, status, createdAt}`

## 2. 商品与搜索 Products
- `GET /products?keyword=&categoryId=&merchantId=&minPrice=&maxPrice=&sort=default|price_asc|price_desc|sales|new&page=&pageSize=&currency=` → `{list,total}`；item: `{id, name, subtitle, mainImage, images[], price(分), originalPrice, stock, sales, merchantId, merchantName, categoryId, tags[], rating, isFlash, flashPrice, currency}`
- `GET /products/:id?currency=` → 详情 + `skus: [{id, name, specValues, price, stock, code}]` + `merchant{id,name,rating}` + `recommendations[]`
- `GET /categories` → 树形 `[{id, name, parentId, children[]}]`
- `GET /search/suggest?keyword=` → `{keywords: []}`

## 3. 购物车 Cart（登录）
- `GET /cart` → `{items: [{id, skuId, productId, productName, skuName, image, price, quantity, checked, stock, currency}], totalQuantity, checkedQuantity, totalPrice}`
- `POST /cart/items` `{skuId, quantity, checked?}`
- `PUT /cart/items/:id` `{quantity?|checked?}`
- `DELETE /cart/items/:id`
- `DELETE /cart` 清空
- `POST /cart/merge` `{items: [{skuId, quantity}]}`（游客购物车合并）

## 3.5 收货地址 Addresses（登录）
- `GET /addresses` 我的地址列表
- `POST /addresses` `{name, phone, province, city, district, detail, isDefault?}` 新增地址
- `PUT /addresses/:id` 编辑地址
- `DELETE /addresses/:id` 删除地址

## 4. 订单 Orders（登录）
- `POST /orders` `{cartItemIds?: [], addressId?, address?: {name, phone, detail}, couponId?, remark?, currency?}`（地址二选一：addressId 走服务端地址薄，或传 address 快照；空数组=全选购物车）→ `{order}`
- `GET /orders?status=&page=&pageSize=` status: `pending_payment|paid|shipped|completed|cancelled|refunding|refunded`
- `GET /orders/:id` → 含 `items[]`、`address`、`tracking`、`payments`、`statusText`
- `POST /orders/:id/cancel`
- `POST /orders/:id/confirm` 确认收货
- `POST /orders/:id/apply-refund` `{reason}`（售后）

order 对象: `{id, orderNo, status, statusText, totalAmount, discountAmount, couponAmount, payableAmount, currency, paymentMethod, address:{name,phone,detail}, items:[{productId, productName, skuName, image, price, quantity}], createdAt, paidAt, shippedAt, completedAt}`

## 5. 支付 Payments
- `GET /payments/methods` → `[{code: wechat|alipay, name}]`
- `POST /orders/:id/pay` `{method: wechat|alipay}` → `{paymentId, qrCodeUrl(沙箱), status: pending}`
- `POST /payments/:id/mock-success`（沙箱模拟支付成功）→ `{status: success}`
- `POST /payments/callback/:channel`（`wechat|alipay`，**公开接口，支付平台异步回调**）`{paymentId, amount, transactionNo?, sign}`；HMAC-SHA256 验签（canonical = 非 sign 字段按 key 排序拼接），成功返回文本 `success`；验签失败 401、金额不符 400
- `GET /payments/:id` 查询支付状态

## 6. 售后与物流
- `POST /aftersales` `{orderId, type: refund|return_refund, reason}`
- `GET /aftersales?page=` 我的售后单
- `GET /aftersales/:id`
- `POST /aftersales/:id/cancel`
- `POST /admin/aftersales/:id/handle` `{approve: bool, note?}`（商家/管理员）
- `POST /admin/orders/:id/ship` `{carrier, trackingNo}`（商家/管理员发货）
- `GET /orders/:id/track` → `{carrier, trackingNo, events: [{time, text}]}`

## 7. 营销：优惠券 / 秒杀 / 分享 / 积分
- `GET /coupons/available?page=` 可领取优惠券列表
- `POST /coupons/:id/claim`
- `GET /my/coupons?status=unused|used|expired`
- `GET /flashsales` 进行中的秒杀 `[{id, productId, productName, image, flashPrice, originalPrice, quota, sold, startAt, endAt}]`
- 管理端创建：`POST /coupons`（admin/merchant，`{name, amount|value, threshold, total, perUser?, startAt?, endAt?|expireAt?, type?, merchantId?}`）、`POST /flashsales`（`{productId, skuId?, flashPrice, quota?, startAt?, endAt?}`，merchant 仅本店商品）
- `POST /flashsales/:id/seckill` `{skuId}`（限购+频控）→ `{ok, order?}`（直接生成待支付订单）
- `POST /shares` `{type: product|invite, refId?}` → `{code, url}`（url: `/s/{code}`；invite 类型无需 refId，用于邀请裂变）
- `GET /shares/:code` → `{type, refId, user, product?}`（访问+1）
- `GET /my/points` -> `{balance}`
- `GET /my/points/logs?page=` -> `[{points, reason, createdAt}]`
- **积分商城**：`GET /points/products`（兑换商品列表）、`POST /points/redemptions` `{productId, quantity}`（积分兑换，扣积分+减库存，返回兑换码）、`GET /my/redemptions`（我的兑换记录）、`POST /admin/points/products` / `PUT /admin/points/products/:id`（管理）、`POST /admin/redemptions/:id/confirm`（确认发放）

## 8. CMS 页面 DIY
- `GET /cms/pages/:key` → 已发布页面 `{key, title, blocks: [{type, props}]}`，type: `banner|nav|goods|image|rich|video|notice`
- `GET /cms/templates` 模板列表
- 管理端: `GET /admin/cms/pages`、`POST /admin/cms/pages` `{key,title,blocks,status}`、`PUT /admin/cms/pages/:id`、`DELETE /admin/cms/pages/:id`、`POST /admin/cms/pages/:id/publish`

## 9. 数据看板（admin/merchant）
- `GET /admin/dashboard/overview` → `{gmv, orderCount, userCount, productCount, conversionRate, avgOrderValue, todayGmv, todayOrders}`
- `GET /admin/dashboard/sales-trend?days=7` → `[{date, gmv, orders}]`
- `GET /admin/dashboard/category-distribution` → `[{name, value}]`
- `GET /admin/dashboard/top-products?limit=10` → `[{name, sales, gmv}]`
- `GET /admin/dashboard/inventory-alerts?threshold=10` → `{threshold, total, list: [{id, name, stock, merchantName}]}`（库存预警）
- `GET /admin/dashboard/settlement?days=30` → 商家对账报表 `{merchants: [{merchantId, merchantName, orderCount, gmv, commissionRate, commission, net}], totalGmv, totalCommission, totalNet, orderCount}`（平台佣金默认 5%）；商家版 `GET /merchant/dashboard/settlement` 仅本店
- 商家版同路径 `/merchant/dashboard/...`（仅本店数据）

## 10. 多商户 Merchants
- `GET /merchants?status=approved` 商家列表
- `GET /merchants/:id` 详情（含在售商品）
- `POST /merchants/apply` `{name, contactName, contactPhone, description}`（user 角色申请）
- `GET /admin/merchants` 审核列表、`POST /admin/merchants/:id/review` `{approve: bool}`

## 11. 多语言 / 多货币
- `GET /settings/public` → `{storeName, logo, languages: [{code, name}], defaultLanguage, currencies: [{code, name, symbol, rate}], defaultCurrency, paymentMethods, seckillEnabled...}`
- `GET /i18n/:lang` → `{key: value}`（如 `/i18n/zh-CN`、`/i18n/en-US`）
- `GET /currencies` → `[{code, name, symbol, rate, isDefault}]`
- `GET /convert` `?amount=1000&from=CNY&to=USD` → `{amount, currency, converted}`
- 商品/购物车/订单均支持 `?currency=` 显示换算，下单以店铺基础币种结算

## 12. 智能推荐
- `GET /recommendations?scene=home|detail|cart&productId=&limit=10` → 商品列表（规则：热门/协同/购买历史/品类相似）

## 13. 直播带货
- `GET /live/rooms?status=live` → `[{id, title, cover, status, viewerCount, likeCount, merchantName}]`
- `GET /live/rooms/:id` → 详情 + `products[]`（带货商品）+ `streamUrl`
- `POST /admin/live/rooms` 创建直播间（admin/merchant）
- `POST /live/rooms/:id/action` `{type: like|share}`（点赞/分享）

## 14. 虚拟试衣
- `GET /fitting/products/:productId` → `{productId, sizeChart: [{size, bust, waist, hip, shoulder}], modelUrl, recommendedSize}`
- `POST /fitting/sessions` `{productId, height, weight, gender?}` → `{sessionId, status: processing}`；轮询 `GET /fitting/sessions/:id` → `ready + resultUrl + recommendedSize`

## 15. 风控与安全
- `POST /risk/events`（内部）记录风险事件；`GET /admin/risk/events?page=` 审计列表
- `GET /admin/risk/rules` 规则列表（登录频控、秒杀频控、优惠券防刷、支付风控）
- 登录/注册/秒杀/支付接口自动频控（默认每分钟阈值），超限返回 429 + `code=429`
- 全站安全响应头：CSP / X-Frame-Options: DENY / X-Content-Type-Options: nosniff / Referrer-Policy / Permissions-Policy（无 X-Powered-By）

## 15.5 评价 / 收藏 / 通知
- `GET /products/:id/reviews`（公开，含 rating/reviewCount）、`POST /products/:id/reviews` `{rating: 1-5, content}`（仅已完成购买订单可评价，实时更新商品评分）
- `GET /favorites` / `POST /favorites` `{productId}` / `DELETE /favorites/:productId`（收藏夹）
- `GET /notifications` / `GET /notifications/unread-count` / `PUT /notifications/:id/read` / `PUT /notifications/read-all`（通知中心）

## 15.6 B2B 询价报价（RFQ）
- `POST /quotes` `{productId, quantity, targetPrice?, note?}`（买家发起询价）
- `GET /my/quotes`（我的询价单）、`GET /quotes/:id`
- `POST /quotes/:id/accept`（买家接受报价 → **自动生成按报价金额的待支付订单**）
- `GET /admin/quotes?status=`（商家仅本店）、`POST /admin/quotes/:id/quote` `{price, note?}`（报价，跨商家 403）

## 15.7 管理员审计日志
- `GET /admin/audit-logs`（仅 admin）——商品/订单/用户/营销/CMS/商家审核等管理操作全量审计（操作人/IP/详情）
## 15.8 拼团
- `GET /groupons?status=open|success`（浏览拼团）、`GET /groupons/:id`（详情）
- `POST /groupons` `{productId, targetSize?, hours?}`（开团，团长默认参团；商品需配置拼团价）
- `POST /groupons/:id/join`（参团，生成拼团价待支付订单；满员即成团并通知团员）
- `GET /my/groupons`（我参与的拼团）；超时未满员由 sweeper 自动判失败并取消团员待支付订单
## 16. 管理端商品/订单/用户
- `POST /admin/products`、`PUT /admin/products/:id`、`POST /admin/products/:id/skus`、`DELETE /admin/products/:id`、`POST /admin/products/:id/tiers` `{tiers: [{minQuantity, price}]}`（批发阶梯价）
- `GET /admin/orders?status=&merchantId=`、`GET /admin/users?page=`、`PUT /admin/users/:id/status`
- 商家仅能操作本店资源（数据隔离）

## 17. WebSocket
地址: `ws://localhost:4000/ws?token=<JWT>`

客户端 → 服务端消息: `{type: "subscribe", rooms: ["cart", "live:1", "notify"]}`
服务端 → 客户端事件:
- `{type: "cart:changed", data: {totalQuantity, updatedAt}}`（购物车变更实时推送）
- `{type: "notify", data: {title, body}}`（订单/售后/秒杀通知）
- `{type: "live:chat", data: {roomId, user, content}}`
- `{type: "live:like", data: {roomId, count}}`
- `{type: "live:product", data: {roomId, productId}}`（主播推送商品）
- `{type: "flashsale:started", data: {flashSaleId, productId}}`

## 约定
- 时间格式 ISO8601；金额整数分；`currency` 默认 `CNY`。
- 未登录访问受保护接口返回 401；无权限返回 403。
- 分页数据统一 `{list, total, page, pageSize}`。