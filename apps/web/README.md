# apps/web — PC 前端（管理后台 + PC 门店端）

多端电商系统（MVP）的 PC 前端，基于 **Vue 3 + Vite + Element Plus**，一个 Vite 工程包含两个应用：

| 应用 | 入口 | 访问地址（dev） | 说明 |
|---|---|---|---|
| PC 门店端（Storefront） | `index.html` | http://localhost:5173 | 买家端：首页/商品/购物车/下单/秒杀/直播/优惠券/积分/试衣 |
| 管理后台（Admin Console） | `admin.html` | http://localhost:5173/admin.html | 管理员/商家端：看板/商品/订单/营销/CMS/审核/风控/用户 |

## 环境要求

- Node.js >= 20（建议 22）
- 后端服务运行在 `http://localhost:4000`（见仓库根目录 README / docs/api.md）

## 启动

```bash
npm install          # 安装依赖（若网络慢可加 --no-audit --no-fund）
npm run dev          # 启动 Vite dev server（端口 5173，已配置 /api 与 /ws 代理）
```

- PC 门店端：http://localhost:5173
- 管理后台：http://localhost:5173/admin.html

## 构建

```bash
npm run build        # 产出 dist/（index.html + admin.html 双入口）
npm run preview      # 本地预览构建产物
```

## 种子账号（后端内置）

| 账号 | 密码 | 角色 |
|---|---|---|
| admin | admin123 | 管理员 |
| merchant | merchant123 | 商家 |
| user | user123 | 买家 |

## 关键约定

- axios baseURL：`/api/v1`（dev 由 Vite 代理到 `http://localhost:4000`）。
- 响应统一解包 `{code, data, message}`：`code !== 0` 弹 `ElMessage.error`；HTTP 401 清除 token 并跳转登录页。
- 价格字段单位为**分**，前端按选中币种符号格式化；商品/购物车/订单接口通过 `?currency=` 换算。
- WebSocket：`ws://localhost:4000/ws?token=<JWT>`（dev 走 `/ws` 代理），登录后自动订阅 `cart`、`notify` 房间，购物车实时刷新；直播间订阅 `live:{roomId}`。
- 收货地址无后端接口，保存在浏览器 localStorage（`ecom_addresses`）。
- i18n 翻译表 `GET /i18n/:lang` 缓存于 localStorage；语言/币种选择同样持久化。
- 管理端部分“创建类”接口后端可能返回 501，前端已做优雅降级提示。
