# 数据库设计（MySQL 8）

## 设计原则

1. **统一数据模型**：商品/订单/用户等模型全局唯一，所有终端（PC/H5/小程序/APP）读取同一份数据。
2. **金额用整数分存储**（BIGINT），避免浮点误差；`currency` 字段标记币种，默认 CNY（店铺基础币种）。
3. **索引策略**：所有外键与高频查询列建索引；订单/日志按时间倒序。
4. **状态机字段**：订单/售后/秒杀等用字符串状态 + 状态流转约束（应用层保证）。
5. **多商户隔离**：商品/订单带 `merchant_id`，商家维度查询走该列索引。

## 表清单

| 表 | 用途 | 关键索引 |
|---|---|---|
| users | 用户（含商家/管理员） | uk_phone、uk_nickname |
| user_addresses | 收货地址 | idx_user |
| categories | 商品分类（树） | idx_parent |
| merchants | 商家 | idx_status |
| products | 商品 | idx_status_category、idx_merchant、FULLTEXT(name) |
| product_skus | 商品 SKU | idx_product |
| cart_items | 购物车 | idx_user、uk_user_sku |
| orders | 订单 | idx_user_status、idx_merchant、idx_created |
| order_items | 订单明细 | idx_order |
| payments | 支付单 | idx_order、idx_status |
| aftersales | 售后单 | idx_order、idx_user |
| logistics | 物流轨迹 | idx_order |
| coupons | 优惠券 | idx_status_time |
| user_coupons | 用户领券 | idx_user_status、uk_user_coupon |
| flash_sales | 秒杀活动 | idx_time |
| shares | 分享 | uk_code |
| points_logs | 积分流水 | idx_user_time |
| cms_pages | CMS 页面 | uk_key |
| cms_templates | CMS 模板 | - |
| translations | 语言包 | uk_lang |
| currencies | 币种 | uk_code |
| live_rooms | 直播间 | idx_status |
| live_messages | 直播间消息 | idx_room_time |
| fitting_garments | 试衣商品 | uk_product |
| fitting_sessions | 试衣会话 | idx_user |
| risk_rules | 风控规则 | - |
| risk_events | 风险事件 | idx_type_time |

## 数据访问层

当前服务通过 `server/src/store.js` 提供统一接口（all/find/get/insert/update/remove），开发模式为 JsonStore（文件持久化），生产环境实现 MySqlStore 即可无缝切换（建表 SQL 见 `db/schema.sql`）。

## 关键表 DDL 说明

```sql
-- 订单表（核心）
CREATE TABLE orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(32) NOT NULL COMMENT "订单号",
  user_id BIGINT UNSIGNED NOT NULL,
  merchant_id BIGINT UNSIGNED NOT NULL,
  status ENUM("pending_payment","paid","shipped","completed","cancelled","refunding","refunded") NOT NULL DEFAULT "pending_payment",
  total_amount BIGINT NOT NULL COMMENT "总金额(分)",
  discount_amount BIGINT NOT NULL DEFAULT 0,
  coupon_amount BIGINT NOT NULL DEFAULT 0,
  payable_amount BIGINT NOT NULL COMMENT "应付(分)",
  currency CHAR(3) NOT NULL DEFAULT "CNY",
  payment_method VARCHAR(16) NULL,
  address JSON NOT NULL COMMENT "地址快照",
  remark VARCHAR(255) NULL,
  flash_sale_id BIGINT UNSIGNED NULL,
  paid_at DATETIME NULL, shipped_at DATETIME NULL, completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user_status (user_id, status),
  KEY idx_merchant (merchant_id),
  KEY idx_created (created_at),
  UNIQUE KEY uk_order_no (order_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> 完整 DDL 见 `db/schema.sql`。JSON 字段使用 MySQL 8 原生 JSON 类型（订单地址快照、商品图集、CMS 区块等）。
