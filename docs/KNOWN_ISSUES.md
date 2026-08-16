# 源码注意事项与定制指南（KNOWN ISSUES）

> 本文档列出**交付审计发现的待办事项**与**常见定制修改点**。
> 已写入其他文档的注意事项在此只做索引（见第二节），不重复正文。
> 状态标记：⬜ 待办 · ✅ 已就绪（可直接用）

## 1. 待办事项 / 已知限制（文档未覆盖）

### 1.1 LICENSE 缺失（售卖/开源前必处理）
- 现状：README.md 声称 MIT License，但仓库根目录**没有 LICENSE 文件**。
- 影响：买家无法确认授权条款；商业售卖建议改为《源码授权协议》文件，或补充 MIT LICENSE。
- 修改点：在仓库根目录新增 LICENSE（MIT 全文），或与买家签授权协议后删除 README 中的 MIT 声明。

### 1.2 真实支付接入（微信/支付宝）
- 现状：支付为**沙箱 mock**（POST /payments/:id/mock-success 直接置成功；回调 POST /payments/callback/:channel 已实现 HMAC-SHA256 验签与状态推进，可作真实接入入口）。
- 需要买家完成：申请微信支付/支付宝商户号 → 配置商户证书/密钥到 server/.env.example 的 WECHAT_PAY_KEY / ALIPAY_PAY_KEY → 将统一下单逻辑替换 server/src/routes/payments.js 中 POST /orders/:id/pay 的 mock 二维码分支 → 配置支付平台回调域名指向 /api/v1/payments/callback/:channel。
- 修改点：server/src/routes/payments.js、server/src/config.js。

### 1.3 小程序 / APP 未真机验证
- 现状：apps/mobile 的 H5 与微信小程序（mp-weixin）**构建通过**，H5 浏览器实测正常；但**未在微信开发者工具/真机、iOS/Android 真机跑通**。
- 需要买家完成：微信开发者工具导入 apps/mobile/dist/build/mp-weixin → 配置 request/socket 合法域名 → 真机预览；APP 用 HBuilderX 云打包（详见 deploy/README.md 多端部署表）。
- 修改点：apps/mobile/src/config.js（API/WS 地址）、微信公众平台后台（域名白名单）。

### 1.4 无 CI（可选增强）
- 现状：无 GitHub Actions 流水线，测试需手动执行。
- 建议：新增 .github/workflows/test.yml，在 main/master 推送时执行 server/test/integration.mjs（含 ECOM_MODE=micro 与 USE_MYSQL=true 两模式）+ unit/concurrency/timeout。

### 1.5 阿拉伯语（ar-SA）无 RTL 布局适配
- 现状：语言包含 ar-SA，但页面布局未做从右到左（RTL）翻转。
- 影响：面向中东市场定制时需要处理；注意 dir 属性与 CSS 逻辑属性（margin-inline 等）。

## 2. 其他注意事项（已在对应文档中，阅读索引）

| 注意事项 | 位置 |
|---|---|
| Redis 缓存/队列为内存实现，生产换 Redis + BullMQ（接口抽象已就绪） | docs/architecture.md §5、middleware.js |
| 秒杀并发为单进程原子扣减，多实例需 Redis DECR | docs/architecture.md §2(b) |
| 支付沙箱说明与 mock 接口 | docs/api.md、docs/DELIVERY.md |
| JWT_SECRET / 支付密钥生产必须修改 | deploy/README.md 环境变量表、server/.env.example |
| MySQL 表结构与索引 | docs/database.md、db/schema.sql |
| 微服务形态（9 服务 + 网关，10 进程）与单体切换 | docs/architecture.md §2.5、README.md |
| 多端部署（Nginx 反代 /api + /ws、小程序域名、APP 云打包） | deploy/README.md |
| 测试命令与 383 项断言 | README.md 快速启动 |
| 种子数据重建（node src/seed.js --force） | server/package.json scripts |

## 3. 常见定制修改点（买家改需求时从这些地方入手）

| 定制需求 | 修改位置 |
|---|---|
| 改平台名称/Logo/首页文案 | server/src/routes/i18n.js（settings/public）、apps/web 门店组件、apps/mobile/src/pages/index |
| 改币种/汇率 | server/src/seed.js（currencies）、数据库 currencies 表 |
| 加语言包 | server/src/seed.js（translations）→ 新增 lang 条目，前端字典 apps/mobile/src/utils/i18n.js |
| 改商品/商家/用户演示数据 | server/src/seed.js（npm run seed 重建） |
| 改支付方式/费率/佣金 | server/src/config.js（commissionRate、paymentSecrets）、server/src/routes/dashboard.js（结算） |
| 改秒杀/优惠券规则 | server/src/routes/marketing.js、services/marketing-service |
| 改订单超时时间 | server/src/config.js（orderTimeoutMinutes） |
| 改风控阈值（登录/秒杀/领券频控） | server/src/config.js（rateLimits）、middleware.js |
| 改购物车同步/直播等实时能力 | server/src/ws.js（房间模型）、services/gateway/index.js（WS 中枢） |
| 对接自有 UI 框架 | apps/web/src（Vue3 + Element Plus）、apps/mobile/src（uni-app） |
| 切 MySQL / 换库 | server/.env.example（USE_MYSQL、DB_*）；表结构 db/schema.sql |
| 微服务单独部署某服务 | services/<name>/index.js（独立进程/端口，见 docs/architecture.md §2.5） |
| 接真实 Redis（缓存/队列/秒杀） | middleware.js（cache/queue 抽象）、marketing 秒杀（DECR） |

## 4. 验收自检清单（买家部署后逐项勾选）

- [ ] npm install 后 npm run dev:server + npm run dev:web 可跑通演示动线（注册→加购→下单→支付→发货→收货→评价→售后）
- [ ] cd server && node test/integration.mjs 171 项全绿（可选 ECOM_MODE=micro 验证微服务形态）
- [ ] node test/concurrency.mjs 秒杀防超卖通过
- [ ] node test/timeout.mjs 订单超时自动取消通过
- [ ] MySQL 模式：USE_MYSQL=true + db/schema.sql 导入后全流程可用
- [ ] 生产部署前修改 JWT_SECRET 与支付密钥（deploy/README.md）
- [ ] 小程序/APP 真机验证（见 1.3）
