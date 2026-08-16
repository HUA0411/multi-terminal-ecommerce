# 多端电商系统（Multi-Terminal E-Commerce）

一套后端支撑 **PC / H5 / 小程序 / APP** 多端前端的电商系统（MVP 完整闭环），前后端彻底分离，支持**模块化单体 / 微服务双形态**运行，覆盖从登录、购物到支付、售后、运营的完整交易链路，并实现多商户、B2B/B2C 混合、多语言多货币、实时同步、安全风控等进阶能力。

> 作者：[HUA0411](https://github.com/HUA0411) · 个人简历：https://github.com/HUA0411/resume

## 双形态架构

同一套代码支持两种运行形态，可平滑切换：

| 形态 | 说明 | 启动 |
|---|---|---|
| 模块化单体（默认） | 所有领域模块同进程组合，零依赖开箱即用 | `npm run dev:server` |
| 微服务 | 9 个领域服务 + API 网关，独立进程/端口/数据（表级隔离） | `npm run dev:micro` |

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

| 服务 | 端口 | 自有数据 | 职责 |
|---|---|---|---|
| auth | 4010 | users, addresses | 登录/注册/微信/地址/用户管理/积分余额 |
| catalog | 4020 | products, SKU, categories, reviews, favorites, fitting, translations, currencies | 商品/搜索/评价/收藏/试衣/推荐/汇率 |
| cart | 4030 | cartItems | 购物车实时同步 |
| trade | 4040 | orders, orderItems, payments, logistics, aftersales | 订单编排（下单/支付/售后/物流） |
| marketing | 4050 | coupons, flashSales, shares, points, groupons | 券/秒杀/分享/积分/拼团 |
| merchant | 4060 | merchants, quotes | 入驻/审核/RFQ/B2B 客户 |
| content | 4070 | cmsPages, liveRooms | CMS 页面/直播 |
| platform | 4080 | notifications, riskEvents, auditLogs | 通知/风控/审计 |
| dashboard | 4090 | （聚合 BFF） | 数据看板/对账报表 |

## 核心能力（MVP 闭环）

**基础交易流程**
- 用户登录：账号密码 / 注册 / 微信 mock，JWT 统一身份认证（user / merchant / admin 三角色数据隔离）
- 商品展示：SKU / 分类 / 搜索 / 排序 / 分页 / 币种换算
- 购物车实时同步：WebSocket 推送 `cart:changed`，多端购物车状态实时一致
- 订单系统：下单（按商家拆单）→ 支付 → 发货 → 收货 → 完成 状态机
- 支付对接：微信 / 支付宝适配器 + HMAC-SHA256 回调验签 + 沙箱 mock 支付
- 售后与物流：退款/退货申请、商家审核、物流轨迹

**运营与销售**
- 优惠券：领券 / 满减 / 折扣 / 商家券 / 下单抵扣
- 秒杀：进程内原子扣减防超卖（并发压测验证），每用户限购，超时释放名额
- 分享系统：分享链接 + 点击追踪 + 邀请裂变（被邀请人首单奖励积分）
- 会员积分：下单返积分、积分商城兑换、积分流水

**管理与数据**
- CMS 页面 DIY：9 种区块（banner/nav/goods/秒杀/拼团/image/rich/video/notice），可视化编辑 + 实时预览，PC 与移动端共用渲染
- 数据看板：GMV / 转化率 / 客单价 / 销售趋势 / 品类分布 / Top 商品 / 退款率 / 低库存预警 / WS 实时在线与推送，订单与对账 CSV 导出

**进阶能力**
- 多商户：入驻申请 / 审核 / 商家数据隔离 / 对账报表（GMV/佣金/净额）
- B2B/B2C 混合：批发阶梯价、RFQ 询价报价、B2B 客户管理
- 多语言多货币：4 语言（含 ja-JP / ar-SA）、6 币种汇率换算
- 直播带货：直播间 + WebSocket 弹幕/点赞/商品推送
- 智能推荐：热门 + 品类偏好 + 协同过滤（跨服务聚合用户信号）
- 虚拟试衣：尺码推荐算法 + 试衣会话（3D/AR 预留）
- 安全风控：频控防刷（登录/秒杀/领券）、风控事件审计、管理员操作审计

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Node.js 22 + Express（模块化单体 / 微服务双形态）+ WebSocket |
| PC 前端 | Vue 3 + Vite + Element Plus（门店端 + 管理后台） |
| 多端前端 | uni-app + Vue 3（H5 / 微信小程序 / APP 一套代码） |
| 数据库 | MySQL 8（真实接入验证 + 索引）+ JsonStore 开发模式双实现 |
| 缓存/队列 | Redis + BullMQ（接口抽象，内存实现可降级） |
| 部署 | Docker / nginx（/api + /ws 反向代理）/ PM2（deploy/） |

## 快速启动

```bash
npm install        # 工作区安装（server + apps + services）

# 单体形态（默认，零依赖）
npm run dev:server   # API :4000
npm run dev:web      # PC 前端 :5173（门店 + 管理后台）

# 微服务形态
npm run dev:micro    # 网关 :4000 + 9 服务 :4010-4090

# 测试（383 项断言）
cd server && node test/integration.mjs   # 集成 171 项（微服务形态：ECOM_MODE=micro）
cd server && node test/unit.mjs          # 单元 18
cd server && node test/concurrency.mjs   # 并发压测 14（秒杀防超卖等）
cd server && node test/timeout.mjs       # 订单超时 9
```

种子账号：`admin/admin123`（管理员）· `merchant/merchant123`（商家）· `user/user123`（买家）· `13800000004/user123`（批发客户）

## 文档

- [架构设计](docs/architecture.md)（含微服务拆分方案）
- [API 契约](docs/api.md)（REST + WebSocket 全量接口）
- [数据库设计](docs/database.md)（MySQL DDL + 索引策略）
- [交付说明](docs/DELIVERY.md)（需求覆盖矩阵）

## 目录结构

```
├── server/          # 后端 API（模块化单体；ECOM_MODE=micro 时作为微服务编排入口）
├── services/        # 微服务集群：9 个领域服务 + API 网关
├── apps/web/        # PC 前端：管理后台 + 门店
├── apps/mobile/     # uni-app 多端前端（H5 / 微信小程序 / APP）
├── db/schema.sql    # MySQL 8 建表脚本（含索引）
├── docs/            # 架构 / API / 数据库 / 交付文档
└── deploy/          # Docker / nginx / PM2 部署套件
```

## License

MIT（示例项目，供学习参考）
