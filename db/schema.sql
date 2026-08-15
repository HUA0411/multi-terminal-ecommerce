-- ============================================================
-- 多端电商系统 MySQL 8 完整建表脚本（含索引）
-- 执行: mysql -u ecom -p ecommerce < db/schema.sql
-- 金额一律为整数「分」（BIGINT），币种默认 CNY
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL COMMENT "手机号/登录账号",
  nickname VARCHAR(64) NOT NULL,
  avatar VARCHAR(512) NOT NULL DEFAULT "",
  password VARCHAR(128) NOT NULL COMMENT "bcrypt hash",
  role ENUM("user","merchant","admin") NOT NULL DEFAULT "user",
  merchant_id BIGINT UNSIGNED NULL COMMENT "商家ID（role=merchant 时）",
  points INT NOT NULL DEFAULT 0,
  customer_type ENUM("retail","wholesale") NOT NULL DEFAULT "retail" COMMENT "B2C/B2B 客户类型",
  status ENUM("active","banned") NOT NULL DEFAULT "active",
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_phone (phone),
  KEY idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_addresses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(32) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  province VARCHAR(32) NOT NULL DEFAULT "",
  city VARCHAR(32) NOT NULL DEFAULT "",
  district VARCHAR(32) NOT NULL DEFAULT "",
  detail VARCHAR(255) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
  name VARCHAR(64) NOT NULL,
  icon VARCHAR(64) NOT NULL DEFAULT "",
  sort INT NOT NULL DEFAULT 0,
  KEY idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS merchants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  name VARCHAR(128) NOT NULL,
  logo VARCHAR(512) NOT NULL DEFAULT "",
  description VARCHAR(512) NOT NULL DEFAULT "",
  contact_name VARCHAR(32) NOT NULL DEFAULT "",
  contact_phone VARCHAR(20) NOT NULL DEFAULT "",
  rating DECIMAL(2,1) NOT NULL DEFAULT 0,
  status ENUM("pending","approved","rejected","suspended") NOT NULL DEFAULT "pending",
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_status (status),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  merchant_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255) NOT NULL DEFAULT "",
  description TEXT NULL,
  main_image VARCHAR(512) NOT NULL DEFAULT "",
  images JSON NOT NULL,
  price BIGINT NOT NULL COMMENT "售价(分)",
  original_price BIGINT NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  sales INT NOT NULL DEFAULT 0,
  tags JSON NULL,
  rating DECIMAL(2,1) NOT NULL DEFAULT 5.0,
  status ENUM("draft","on","off") NOT NULL DEFAULT "draft",
  is_flash TINYINT(1) NOT NULL DEFAULT 0,
  flash_price BIGINT NULL,
  wholesale_tiers JSON NULL COMMENT "B2B 批发阶梯价 [{minQuantity, price}]",
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_status_category (status, category_id),
  KEY idx_merchant (merchant_id),
  KEY idx_price (price),
  FULLTEXT KEY ft_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_skus (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(128) NOT NULL,
  spec_values JSON NULL,
  price BIGINT NOT NULL COMMENT "SKU 价(分)",
  stock INT NOT NULL DEFAULT 0,
  code VARCHAR(64) NOT NULL DEFAULT "",
  KEY idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  sku_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  checked TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user (user_id),
  UNIQUE KEY uk_user_sku (user_id, sku_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(32) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  merchant_id BIGINT UNSIGNED NOT NULL,
  status ENUM("pending_payment","paid","shipped","completed","cancelled","refunding","refunded") NOT NULL DEFAULT "pending_payment",
  total_amount BIGINT NOT NULL,
  discount_amount BIGINT NOT NULL DEFAULT 0,
  coupon_id BIGINT UNSIGNED NULL,
  coupon_amount BIGINT NOT NULL DEFAULT 0,
  payable_amount BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT "CNY",
  payment_method VARCHAR(16) NULL,
  address JSON NOT NULL COMMENT "地址快照",
  remark VARCHAR(255) NOT NULL DEFAULT "",
  flash_sale_id BIGINT UNSIGNED NULL,
  paid_at DATETIME NULL,
  shipped_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_order_no (order_no),
  KEY idx_user_status (user_id, status),
  KEY idx_merchant (merchant_id),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  sku_id BIGINT UNSIGNED NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  sku_name VARCHAR(128) NOT NULL DEFAULT "",
  image VARCHAR(512) NOT NULL DEFAULT "",
  price BIGINT NOT NULL,
  quantity INT NOT NULL,
  subtotal BIGINT NOT NULL,
  KEY idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  method ENUM("wechat","alipay") NOT NULL,
  amount BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT "CNY",
  status ENUM("pending","success","failed","refunded") NOT NULL DEFAULT "pending",
  transaction_no VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME NULL,
  KEY idx_order (order_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS aftersales (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM("refund","return_refund") NOT NULL DEFAULT "refund",
  reason VARCHAR(255) NOT NULL DEFAULT "",
  amount BIGINT NOT NULL,
  status ENUM("pending","approved","rejected","refunded","cancelled") NOT NULL DEFAULT "pending",
  merchant_note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_order (order_id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS logistics (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  carrier VARCHAR(32) NOT NULL,
  tracking_no VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT "shipping",
  events JSON NOT NULL COMMENT "轨迹事件数组",
  shipped_at DATETIME NULL,
  UNIQUE KEY uk_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupons (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  merchant_id BIGINT UNSIGNED NULL COMMENT "NULL=平台券",
  name VARCHAR(128) NOT NULL,
  type ENUM("full_reduction","discount") NOT NULL,
  threshold BIGINT NOT NULL DEFAULT 0 COMMENT "满减门槛(分)",
  value BIGINT NOT NULL COMMENT "减免金额(分)或折扣(如 88=8.8 折)",
  total INT NOT NULL,
  claimed INT NOT NULL DEFAULT 0,
  per_user INT NOT NULL DEFAULT 1,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  status ENUM("active","inactive") NOT NULL DEFAULT "active",
  KEY idx_status_time (status, start_at, end_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_coupons (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  coupon_id BIGINT UNSIGNED NOT NULL,
  status ENUM("unused","used","expired") NOT NULL DEFAULT "unused",
  claimed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at DATETIME NULL,
  order_id BIGINT UNSIGNED NULL,
  KEY idx_user_status (user_id, status),
  UNIQUE KEY uk_user_coupon (user_id, coupon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flash_sales (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  sku_id BIGINT UNSIGNED NOT NULL,
  flash_price BIGINT NOT NULL COMMENT "秒杀价(分)",
  quota INT NOT NULL,
  sold INT NOT NULL DEFAULT 0,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  status ENUM("active","scheduled","ended","inactive") NOT NULL DEFAULT "active",
  KEY idx_time (start_at, end_at),
  KEY idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shares (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(24) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(16) NOT NULL DEFAULT "product",
  ref_id BIGINT UNSIGNED NOT NULL,
  clicks INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS points_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  points INT NOT NULL COMMENT "正=增加 负=扣减",
  reason VARCHAR(255) NOT NULL,
  ref_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_time (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cms_pages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(64) NOT NULL,
  title VARCHAR(128) NOT NULL,
  status ENUM("draft","published") NOT NULL DEFAULT "draft",
  blocks JSON NOT NULL COMMENT "区块数组",
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cms_templates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  content JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS translations (
  lang VARCHAR(16) NOT NULL,
  data JSON NOT NULL COMMENT "key->value 语言包",
  UNIQUE KEY uk_lang (lang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS currencies (
  code CHAR(3) NOT NULL,
  name VARCHAR(32) NOT NULL,
  symbol VARCHAR(8) NOT NULL DEFAULT "",
  rate DECIMAL(10,6) NOT NULL COMMENT "相对基础币种汇率",
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM("active","inactive") NOT NULL DEFAULT "active",
  UNIQUE KEY uk_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS live_rooms (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  merchant_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(128) NOT NULL,
  cover VARCHAR(512) NOT NULL DEFAULT "",
  status ENUM("live","off") NOT NULL DEFAULT "off",
  viewer_count INT NOT NULL DEFAULT 0,
  like_count INT NOT NULL DEFAULT 0,
  product_ids JSON NULL COMMENT "带货商品",
  stream_url VARCHAR(512) NOT NULL DEFAULT "" COMMENT "HLS 流地址",
  started_at DATETIME NULL,
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS live_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM("chat","like","enter","product") NOT NULL DEFAULT "chat",
  content VARCHAR(512) NOT NULL DEFAULT "",
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_room_time (room_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fitting_garments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  model_url VARCHAR(512) NOT NULL DEFAULT "" COMMENT "3D 模型地址",
  size_chart JSON NOT NULL COMMENT "尺码表",
  UNIQUE KEY uk_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fitting_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  body_profile JSON NOT NULL COMMENT "身高体重等",
  recommended_size VARCHAR(16) NOT NULL DEFAULT "",
  status ENUM("processing","ready","failed") NOT NULL DEFAULT "processing",
  result_url VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS risk_rules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  `key` VARCHAR(64) NOT NULL,
  action ENUM("limit","review","block") NOT NULL DEFAULT "limit",
  threshold INT NOT NULL DEFAULT 0,
  window_sec INT NOT NULL DEFAULT 60,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  description VARCHAR(255) NOT NULL DEFAULT ""
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS risk_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  type VARCHAR(32) NOT NULL,
  level ENUM("low","medium","high") NOT NULL DEFAULT "low",
  detail JSON NULL,
  ip VARCHAR(64) NOT NULL DEFAULT "",
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_type_time (type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 基础币种
INSERT INTO currencies (code, name, symbol, rate, is_default) VALUES
("CNY","人民币","¥",1.000000,1),
("USD","美元","$",0.140000,0),
("EUR","欧元","€",0.130000,0),
("HKD","港币","HK$",1.090000,0),
("JPY","日元","¥",21.500000,0),
("GBP","英镑","£",0.110000,0)
ON DUPLICATE KEY UPDATE rate=VALUES(rate);