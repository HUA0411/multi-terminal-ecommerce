# 多端电商系统 - 移动端（apps/mobile）

基于 **uni-app (Vue 3) + Vite** 的多端移动商城前端，一套代码可编译为 **H5 / 微信小程序 / App**。

> API 契约见根目录 `docs/api.md`，后端运行于 `http://localhost:4000`（前缀 `/api/v1`）。
> 测试账号：`admin/admin123`、`merchant/merchant123`、`user/user123`。

## 功能清单

- 首页：`GET /cms/pages/home` 装修块渲染（banner/nav/goods/image/rich/video/notice）+ `GET /recommendations?scene=home` 推荐商品
- 分类：分类树 + 按分类浏览商品（综合/销量/新品/价格排序）
- 商品：搜索（联想词）、列表（关键词/分类/排序/分页）、详情（SKU 选择、加购/立即购买）
- 购物车：增删改查、勾选、全选、游客购物车本地化 + 登录后 `POST /cart/merge` 合并、WebSocket 实时同步（`cart:changed`）
- 订单：结算（本地收货地址 + 优惠券 + 备注）、支付（沙箱二维码 + mock-success + 轮询）、列表/详情、取消/确认收货/申请退款/物流跟踪
- 营销：优惠券中心（领取）、我的优惠券（未使用/已使用/已过期）、积分明细、限时秒杀（倒计时 + 秒杀下单）
- 直播：直播间列表、直播房间（视频 + WS 聊天/点赞/商品推送 + 点赞/分享动作）
- 虚拟试衣：尺码表 + 创建试衣会话 + 轮询生成结果
- 我的：用户信息、订单入口、积分、语言/货币切换
- 登录：账号密码 / 注册 / 微信（mock）

## 运行

环境要求：Node.js >= 20，npm >= 10。

```bash
cd apps/mobile
npm install
```

### H5

```bash
npm run dev:h5
# 打开 http://localhost:5173 （H5 开发环境直连 http://localhost:4000/api/v1）
```

生产构建：

```bash
npm run build:h5   # 产物在 dist/build/h5
```

### 微信小程序

```bash
npm run dev:mp-weixin   # 产物在 dist/dev/mp-weixin
```

打开微信开发者工具 → 导入项目 → 选择 `dist/dev/mp-weixin` 目录。

> 小程序/APP 请求后端需配置合法域名；开发期可勾选“不校验合法域名”。
> 上线前请在 `src/config.js` 中将 `API_BASE_URL` / `WS_URL` 替换为生产域名（https/wss）。

### App

```bash
npm run dev:app      # 生成 App 资源，用 HBuilderX 云打包或自定义基座运行
```

## 目录结构

```
apps/mobile
├── package.json
├── vite.config.js
├── index.html
├── scripts/gen-icons.mjs      # 静态图标生成脚本
├── src
│   ├── main.js / App.vue / uni.scss
│   ├── manifest.json / pages.json
│   ├── config.js              # 后端地址配置（H5/小程序/APP 条件编译）
│   ├── api/index.js           # 全部接口封装
│   ├── store/index.js         # 登录态 / 购物车角标 / 语言货币 响应式状态
│   ├── utils
│   │   ├── request.js         # uni.request 封装（token / {code,data,message} 解包 / 401 处理）
│   │   ├── ws.js              # WebSocket 封装（H5 WebSocket / 小程序 uni.connectSocket）
│   │   ├── format.js / address.js / guestCart.js / i18n.js
│   ├── components             # ProductCard / CountDown / EmptyState / CmsBlocks
│   ├── static                 # 图标与占位图
│   └── pages                  # 全部业务页面
└── README.md
```

## 说明与限制（MVP）

- 收货地址无后端接口，保存在本地存储（`uni.setStorageSync('addresses')`）。
- CMS 装修块 props 结构以兼容多种字段（images/items/list/url/src...）的方式解析。
- 支付为沙箱模式：`POST /orders/:id/pay` 后调用 `POST /payments/:id/mock-success` 模拟成功。
- 秒杀默认使用商品第一个 SKU 下单。
- 直播聊天为单向接收 + 本地回显（服务端无发送接口）。
