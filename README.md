# 多端电商系统（Multi-Terminal E-Commerce）

> 一套后台支撑 PC / H5 / 小程序 / APP 等多个前端的电商系统（MVP）。
> 前后端彻底分离，前端通过 REST + WebSocket 从统一 API 网关获取数据，一个后台服务支撑所有终端。

## 核心能力（MVP 闭环）

**基础交易流程**
- 用户登录（账号密码 + 微信 mock）/ JWT 统一身份认证
- 商品展示（SKU / 分类 / 搜索 / 排序 / 分页）
- 购物车实时同步（WebSocket 推送 cart:changed）
- 订单系统（下单 → 支付 → 发货 → 收货 → 完成 状态机）
- 支付对接（微信 / 支付宝适配器 + 沙箱 mock 支付）
- 售后与物流（退款/退货申请、物流轨迹）

**运营与销售**
- 优惠券（领券、满减、下单抵扣）
- 秒杀（库存保护、限购、频控）
- 分享系统（分享链接 + 追踪点击）
- 会员积分（下单得积分、积分流水）

**管理与数据**
- CMS 页面 DIY（区块化页面配置、发布/草稿）
- 数据看板（GMV、订单、用户、Top 商品、销售趋势、品类分布）

**进阶设计**
- 多商户入驻（B2B / B2C 混合，商家维度数据隔离）
- 多语言 / 多货币（i18n 翻译表、币种汇率换算）
- Redis 缓存 + 消息队列（生产配置，接口抽象可降级内存实现）
- 风控（统一认证、频控、防盗刷规则、风险事件审计）
- 直播带货（直播间 + WebSocket 聊天/点赞/商品推送）
- 智能推荐（热门、协同、基于购买历史的推荐）
- 虚拟试衣（尺码推荐 + 试衣会话 mock，预留 3D/AR 接入）

## 技术栈

| 层 | 选型 |
|---|---|
| 后端 | Node.js 22 + Express（模块化单体，可渐进拆分微服务）+ ws |
| PC 前端 | Vue 3 + Vite + Element Plus（apps/web：管理后台 + 门店端） |
| 多端前端 | uni-app + Vue 3（apps/mobile：H5 / 微信小程序 / APP） |
| 数据库 | MySQL 8（db/schema.sql 完整 DDL；开发环境可用文件存储模式） |
| 缓存/队列 | Redis + BullMQ（docker-compose 提供，接口抽象可降级内存实现） |

## 目录结构

```
├── server/          # 后端 API 服务（Express 模块化单体）
├── apps/
│   ├── web/         # PC 前端：管理后台 + 门店
│   └── mobile/      # uni-app 多端前端（H5/小程序/APP）
├── db/schema.sql    # MySQL 8 完整建表脚本（含索引）
├── docs/            # 架构 / API 契约 / 数据库设计
└── docker-compose.yml
```

## 快速开始

```bash
# 1. 启动后端（默认 4000 端口，开发模式使用文件存储 + 内置种子数据）
npm install
npm run dev:server        # 或 node server/src/index.js

# 2. PC 前端（默认 5173）
npm run dev:web

# 3. 多端前端 H5（默认 5174）
npm run dev:mobile:h5

# 4. MySQL + Redis 生产/演示环境
docker compose up -d
```

> 默认种子账号：`admin / admin123`（管理员）、`merchant / merchant123`（商家）、`user / user123`（买家）。
> API 文档见 `docs/api.md`。

## 验证

```bash
npm run test   # server 集成测试（启动服务，覆盖全部 MVP 模块）
```
