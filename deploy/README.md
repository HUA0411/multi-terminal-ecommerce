# 部署指南

## 方式一：Docker 全栈（推荐生产）

```bash
# 1. 构建并启动 mysql + redis + server + web
docker compose -f deploy/docker-compose.yml up -d --build

# 2. 访问
#   PC 前端（门店 + 管理后台）:  http://localhost:8080
#   后端 API:                       http://localhost:4000/api/v1
#   WebSocket:                      ws://localhost:4000/ws?token=<JWT>

# 3. 检查
docker compose -f deploy/docker-compose.yml ps
curl http://localhost:4000/api/v1/health
```

> 首次启动自动执行 `db/schema.sql` 建库建表并灌入基础币种数据。
> 修改 `deploy/docker-compose.yml` 中的 `JWT_SECRET` 后再部署。

## 方式二：PM2 进程管理（后端）

```bash
cd server && npm install --omit=dev
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
```

## 方式三：裸机 Nginx（前端）+ 后端

```bash
# 后端
cd server && npm install --omit=dev && NODE_ENV=production node src/index.js

# 前端构建
cd apps/web && npm install --workspaces=false && npm run build
# 将 apps/web/dist 部署到 nginx html 目录，参照 deploy/nginx.conf
```

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| PORT | 4000 | 后端端口 |
| JWT_SECRET | dev-secret-change-me | 生产必须修改 |
| USE_MYSQL | false | true 时走 MySQL（JsonStore 仅用于演示） |
| DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME | - | MySQL 连接 |
| REDIS_URL | redis://127.0.0.1:6379 | 缓存/队列 |
| DATA_FILE | server/data/db.json | 演示模式数据文件 |

## 多端部署

| 端 | 产物 | 部署 |
|---|---|---|
| PC 门店 + 管理后台 | apps/web/dist | Nginx 静态 + /api /ws 反代 |
| H5 | apps/mobile/dist/build/h5 | Nginx 静态（API 直连后端域名，改 apps/mobile/src/config.js） |
| 微信小程序 | apps/mobile/dist/build/mp-weixin | 微信开发者工具上传；后台配置 request/socket 合法域名 |
| APP | uni-app 云打包 | HBuilderX 云打包（apps/mobile） |
