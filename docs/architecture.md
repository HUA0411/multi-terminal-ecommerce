# 系统架构设计

## 1. 总体架构（前后端彻底分离，一套后台支撑所有终端）

```
┌──────────────────────────────────────────────────────────────────┐
│ 前端多端（独立开发部署）                                            │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────────────┐ │
│  │ PC 门店    │ │ PC 管理后台 │ │ H5 商城    │ │ 小程序 / APP      │ │
│  │ apps/web   │ │ apps/web   │ │ uni-app   │ │ uni-app           │ │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └────────┬─────────┘ │
│        │  REST + WebSocket          │               │            │
└────────┼────────────────────────────┼───────────────┼────────────┘
         ▼                            ▼               ▼
┌──────────────────────────────────────────────────────────────────┐
│ API 网关 /api/v1（统一认证 JWT、频控、日志、缓存）                  │
│ Express 模块化单体（可渐进拆分微服务）                              │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐ ┌──────────────┐ │
│ │auth  │ │product│ │cart  │ │order │ │payment │ │marketing(券/秒杀)│ │
│ ├──────┤ ├──────┤ ├──────┤ ├──────┤ ├────────┤ ├──────────────┤ │
│ │aftersale│logistics│cms │dashboard│merchant│i18n/currency │ │
│ │recommend│live │fitting │risk  │admin  │ws hub(实时)         │ │
│ └──────┴──────┴──────┴──────┴────────┴──────────────┘ │
└───────────────┬──────────────────────────────────────────────────┘
                │
   ┌────────────┼──────────────┐
   ▼            ▼              ▼
 MySQL 8      Redis(缓存/队列) 文件存储(dev/demo)
 (schema.sql)  (BullMQ 可选)   (JsonStore)
```

## 2. 设计原则落地

### (a) 前后端彻底分离
- 前端（apps/web、apps/mobile）通过 `docs/api.md` 契约对接 REST + WebSocket，不依赖任何后端模板。
- 一套 `/api/v1` 网关同时服务 PC / H5 / 小程序 / APP，角色（user/merchant/admin）在同一网关内做数据隔离。

### (b) 微服务可渐进（模块化单体）
- 后端以 feature 模块组织（`server/src/routes/*.js`），模块间仅通过数据存储层通信，无循环依赖。
- 业务增长时按「订单」「支付」「商品」「营销」等边界拆分为独立服务，通过 API Gateway + 消息队列解耦：
  - 订单创建 → 发布 `order.created` 事件（消息队列）
  - 支付回调 → 消费 `payment.succeeded` 事件更新订单状态
  - 秒杀 → 独立高吞吐服务 + Redis 预扣库存
- 当前 `queue` 抽象（middleware.js）提供内存实现，生产替换为 Redis + BullMQ。
- 数据层双实现：JsonStore（演示）+ **MySqlStore（真实 MySQL，已实现并全量验证）**，切换见 docs/database.md。

### (c) 统一数据与状态设计
- 商品/订单/用户等数据模型全局唯一（见 docs/database.md），所有终端读取同一模型。
- 购物车等状态通过 WebSocket 实时同步：任意端增删购物车 → `cart:changed` 推送到该用户所有在线端。

## 2.5 微服务形态（已实现：ECOM_MODE=micro）

同一套代码支持两种运行形态，可平滑切换：

| 形态 | 说明 | 启动方式 |
|---|---|---|
| 模块化单体（默认） | 所有领域模块同进程组合，零依赖开箱即用 | `npm run dev:server` |
| **微服务** | 9 个独立领域服务进程 + API 网关，各自独立端口/数据文件（表级隔离） | `npm run dev:micro`（PowerShell `npm run dev:micro:ps`） |

```
┌─ 外部唯一入口 :4000 ───────────────────────────────────────────┐
│ API 网关（路由代理 / WS 实时中枢 / 内部事件入口 / 健康聚合）      │
└──┬──────────┬──────────┬──────────┬──────────┬────────────────┘
   │          │          │          │          │  服务间：/internal/*（X-Service-Token）
┌──▼──┐  ┌────▼───┐  ┌───▼───┐  ┌──▼─────┐  ┌──▼─────┐        ┌──────────┐
│ auth │  │ catalog│  │ cart  │  │ trade  │  │marketing│  ...   │ platform │
│ 4010 │  │ 4020   │  │ 4030  │  │ 4040   │  │ 4050   │  ...   │ 4080     │
└─────┘  └────────┘  └───────┘  └────────┘  └────────┘        └──────────┘
  merchant:4060  content:4070  dashboard:4090（聚合 BFF，无自有数据）
```

### 服务边界与数据所有权
| 服务 | 端口 | 自有集合（表） | 职责 |
|---|---|---|---|
| auth | 4010 | users, addresses | 登录/注册/微信/地址/用户管理/积分余额 |
| catalog | 4020 | products, productSkus, categories, reviews, favorites, fitting*, translations, currencies | 商品/搜索/评价/收藏/试衣/推荐/汇率 |
| cart | 4030 | cartItems | 购物车实时同步 |
| trade | 4040 | orders, orderItems, payments, logistics, aftersales | 订单编排（下单/支付/售后/物流） |
| marketing | 4050 | coupons, userCoupons, flashSales, shares, pointsLogs, pointsProducts, redemptions, groupons | 券/秒杀/分享/积分/拼团 |
| merchant | 4060 | merchants, quotes | 入驻/审核/RFQ/B2B 客户 |
| content | 4070 | cmsPages, cmsTemplates, liveRooms, liveMessages | CMS 页面/直播 |
| platform | 4080 | notifications, riskEvents, riskRules, auditLogs | 通知/风控/审计 |
| dashboard | 4090 | （无，聚合 BFF） | 看板/对账报表（跨服务聚合） |

### 服务间通信
- **内部 REST**：`/internal/*`，`X-Service-Token` 服务令牌鉴权（与用户 JWT 分离）；跨域读写一律经属主服务。
  - 例：下单（trade）→ auth 取地址/用户 → cart 读/清购物车 → catalog 校验扣库存 → marketing 校验/使用优惠券 → platform 记风控。
- **实时事件**：服务经 `POST 网关 /internal/publish` 发布 WS 事件（cart:changed / notify / dashboard:changed），网关推给订阅端。
- **进程守护**：网关以 stdin 管道拉起子服务；网关退出（含强杀）→ 子服务收到 EOF 自动退出，无孤儿进程。
- **数据隔离**：每个服务只持有 OWNED_COLLECTIONS；MySQL 模式表名 = 集合名，天然表级隔离；JsonStore 模式每服务独立数据文件。
- **集成验证**：`ECOM_MODE=micro node test/integration.mjs` 全量 171 项断言在微服务形态下双库（JsonStore + MySQL）全绿；并发压测 14 项、单元 18、超时 9 同样全绿。

## 3. 技术选型

| 层 | 选型 | 说明 |
|---|---|---|
| 后端 | Node.js 22 + Express | 模块化单体；零构建（ESM），启动即用 |
| 实时 | ws | 认证握手 + 房间订阅（cart/notify/live/flashsale） |
| PC 前端 | Vue 3 + Vite + Element Plus | 管理后台 + 门店端（apps/web） |
| 多端前端 | uni-app + Vue 3 | H5 / 微信小程序 / APP 一套代码（apps/mobile） |
| 数据库 | MySQL 8 | db/schema.sql 含索引；开发模式 JsonStore 零依赖可跑 |
| 缓存 | Redis | 内存 TTL 缓存抽象（middleware.cache），生产换 Redis |
| 队列 | BullMQ | queue 抽象（middleware.queue），生产换 Redis 队列 |
| 认证 | JWT + bcrypt | 统一身份认证，roles 权限中间件 |

## 4. 安全与风控

### 统一身份认证
- JWT 无状态认证；`auth(...roles)` 中间件统一校验，管理员/商家/买家资源隔离。

### 频控（防盗刷）
| 场景 | 默认阈值 | 实现 |
|---|---|---|
| 登录失败 | 20 次/分/IP | rateLimit 中间件 → 429 |
| 注册 | 5 次/分/IP | rateLimit |
| 秒杀请求 | 3 次/分/用户 | rateLimit + 每活动限购 1 单 |
| 领券 | 5 次/5 分/用户 | rateLimit（防刷券） |
| 支付 | 10 次/分/用户 | rateLimit + 大额人工审核事件 |

### 风险事件审计
- 所有异常行为写入 `riskEvents`，管理员在数据看板审计（GET /risk/admin/events）。

### 数据隔离（能力隔绝）
- 商家只能读写本店商品/订单/售后（`assertMerchant`）；
- 用户只能访问自己的购物车/订单/优惠券/地址；
- 未来可扩展多租户数据分库/字段级加密。

## 5. 高并发与性能

### Redis 缓存策略（生产）
| 数据 | Key 模式 | TTL |
|---|---|---|
| 商品列表 | `products:{query}` | 15s |
| 门店配置 | `settings:public` | 60s |
| 首页 CMS | `cms:page:{key}` | 60s |
| 商品详情 | `product:{id}` | 60s |

### 数据库索引（见 db/schema.sql）
- 订单：`(user_id, status)`、`(merchant_id)`、`(created_at)`
- 商品：`(status, category_id)`、`(merchant_id)`、全文索引 name
- SKU：`(product_id)`；购物车：`(user_id)`；优惠券：`(user_id, status)`
- 秒杀：`(start_at, end_at)`；日志类按时间倒序索引

### 秒杀防超卖
1. Redis 预扣库存（原子 DECR）
2. 下单后数据库扣减兜底
3. 未支付订单超时释放库存（队列延迟任务）
4. 每用户限购 + 频控

## 6. 支付对接（微信 / 支付宝）

生产流程：前端调 `POST /orders/:id/pay` → 服务端调用微信/支付宝统一下单 API → 返回支付参数 → 前端拉起收银台 → 支付平台异步回调 `POST /payments/callback`（验签）→ 更新订单状态。

沙箱流程（当前 MVP）：`mock-success` 接口模拟回调，便于全链路演示。

## 6.5 B2B / B2C 混合模式（批发阶梯价）
- 用户维度 `customerType`（retail/wholesale）区分 B2C 与 B2B 客户，管理员可随时切换（PUT /admin/users/:id/customer-type）。
- 商品维度 `wholesaleTiers`（[{minQuantity, price}]）定义批发阶梯价；批发客户购物车与下单自动按数量命中最优档位（如满 2 件 92 折、满 5 件 85 折、满 20 件 78 折）。
- 零售客户不受影响，且默认不可见阶梯价（管理员/批发客户可见）。
- 与多商户天然结合：不同店铺可设置各自商品的批发价。

## 6.6 订单超时自动取消（模拟消息队列延迟任务）
- 待付款订单超过 orderTimeoutMinutes（默认 15 分钟）自动取消：回补商品/SKU 库存、退回优惠券、释放秒杀名额。
- 实现：进程内周期扫描（sweeper.js，幂等），生产可替换为 Redis 延迟队列。
- 验证：`npm run test:timeout -w server`（短 TTL 实例，9/9 通过）。

## 6.7 高并发验证

`npm run test:conc -w server`（server/test/concurrency.mjs）在真实进程上验证：
- 60 并发秒杀请求 65ms 完成，恰好卖出剩余额度（**零超卖**，进程内原子判定）；
- 同一用户高频秒杀触发频控 429 且每活动限购 1 单；
- 50 并发商品列表读全部 200。
> 多实例部署时秒杀库存判定需切换到 Redis DECR 原子扣减（架构预留）。

## 7. 多语言 / 多货币

- 翻译表 `translations(lang, data)`；前端按 `?lang=` 拉取语言包（GET /i18n/:lang）。已内置 zh-CN / en-US / ja-JP / ar-SA 四套语言包。
- 币种表 `currencies(code, rate)`；商品/购物车/订单显示价按 `?currency=` 换算，结算以店铺基础币种（CNY）为准。

## 8. 直播带货

- REST：直播间列表/详情（含带货商品、流地址）。
- WebSocket 房间 `live:{roomId}`：聊天、点赞、主播推品实时广播。
- 流媒体：HLS 地址（demo 为占位），生产接入腾讯云/阿里云直播。

## 9. 虚拟试衣

- MVP：尺码表 + 人体参数 → 尺码推荐算法；试衣会话 mock 渲染。
- 进阶：接入 3D 模型（GLB）+ 云端渲染（腾讯云虚拟试衣 / MetaHuman），`modelUrl` 字段已预留。

## 10. 部署拓扑（生产）

```
nginx (TLS) ──► API 网关 (PM2/Docker) ──► MySQL (主从)
      │                                  └─ Redis (缓存/队列)
      ├──► 静态资源 CDN (前端 dist)
      └──► WebSocket 网关 (ws)
```

## 11. 开发/演示模式

`USE_MYSQL=false`（默认）：JsonStore 文件持久化 + 种子数据，零依赖开箱即用，方便演示与联调。
`USE_MYSQL=true`：按 db/schema.sql 建库后接入 MySqlStore（接口同 JsonStore）。