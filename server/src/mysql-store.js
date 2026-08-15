import mysql from "mysql2/promise";
import { seedData } from "./seed.js";
import { now } from "./util.js";

// ============================================================
// MySqlStore：基于真实 MySQL 8 的数据访问层（与 JsonStore 同接口）
// - 读：启动时全量载入内存，同步读取（谓词过滤与既有路由零改动）
// - 写：内存即时生效 + 异步落库（write-behind 队列，进程退出前 drain）
// - 表：首次启动按种子数据推断列自动建表（camelCase 列 + JSON 序列化）
// ============================================================

function toDbValue(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}

function fromDbValue(v) {
  if (typeof v === "string" && (v.startsWith("{") || v.startsWith("["))) {
    try { return JSON.parse(v); } catch { /* keep raw */ }
  }
  return v;
}

export function createMySqlStore(cfg) {
  let pool = null;
  let db = {};
  const tableCols = {}; // table -> [columns]
  // 种子中为空集合的表需要显式声明列（否则只会建出 id/createdAt/updatedAt）
  const SCHEMA_OVERRIDES = {
    redemptions: { userId: "BIGINT", productId: "BIGINT", productName: "TEXT", image: "TEXT", points: "BIGINT", quantity: "BIGINT", code: "TEXT", status: "TEXT", fulfilledAt: "TEXT" },
    aftersales: { orderId: "BIGINT", userId: "BIGINT", type: "TEXT", reason: "TEXT", amount: "BIGINT", status: "TEXT", merchantNote: "TEXT" },
    cartItems: { userId: "BIGINT", skuId: "BIGINT", quantity: "BIGINT", checked: "TINYINT(1)" },
    notifications: { userId: "BIGINT", title: "TEXT", body: "TEXT", read: "TINYINT(1)" },
  };
  let pending = Promise.resolve();

  function enqueue(task) {
    pending = pending.then(task).catch((e) => console.error("[mysql] persist error:", e.message));
    return pending;
  }

  async function ensureTable(table, rows) {
    if (tableCols[table]) return;
    const cols = new Map([["id", "BIGINT AUTO_INCREMENT PRIMARY KEY"], ["createdAt", "TEXT NULL"], ["updatedAt", "TEXT NULL"]]);
    const rowsArr = Array.isArray(rows) ? rows : (rows ? [rows] : []);
    for (const row of rowsArr) {
      for (const [k, v] of Object.entries(row || {})) {
      if (k === "id") continue;
      if (v === null || v === undefined) {
        if (!cols.has(k)) cols.set(k, "VARCHAR(255) NULL");
        continue;
      }
      const t = (() => {
        if (v === null || v === undefined) return "VARCHAR(255) NULL";
        if (typeof v === "number") return Number.isInteger(v) ? "BIGINT" : "DOUBLE";
        if (typeof v === "boolean") return "TINYINT(1)";
        if (typeof v === "object") return "LONGTEXT";
        if (typeof v === "string") return v.length <= 100 ? "VARCHAR(255)" : "TEXT";
        return "VARCHAR(255)";
      })();
        const cur = cols.get(k);
        if (!cur) cols.set(k, t);
        else if (cur === "VARCHAR(255) NULL" && t !== "VARCHAR(255) NULL") cols.set(k, t);
        else if (t === "LONGTEXT" && cur !== "LONGTEXT") cols.set(k, "LONGTEXT");
      }
    }
    const over = SCHEMA_OVERRIDES[table] || {};
    for (const [k, t] of Object.entries(over)) if (!cols.has(k)) cols.set(k, t);
    const colSql = [...cols.entries()].map(([k, t]) => "`" + k + "` " + t).join(", ");
    await pool.query("CREATE TABLE IF NOT EXISTS `" + table + "` (" + colSql + ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    // 高频查询索引（幂等：已存在时忽略）
    const INDEXES = {
      products: [["merchantId"], ["categoryId"], ["status"]],
      productSkus: [["productId"]],
      orders: [["userId"], ["merchantId"]],
      orderItems: [["orderId"]],
      cartItems: [["userId"]],
      payments: [["orderId"]],
      users: [["phone"]],
      userCoupons: [["userId"]],
      cmsPages: [["key"]],
    };
    const idxDefs = INDEXES[table] || [];
    for (const cols of idxDefs) {
      try {
        await pool.query("CREATE INDEX idx_" + table + "_" + cols.join("_") + " ON `" + table + "` (" + cols.map((x) => "`" + x + "`").join(",") + ")");
      } catch { /* 已存在 */ }
    }
    tableCols[table] = [...cols.keys()];
  }

  async function createTablesFromSeed() {
    const seed = seedData();
    for (const [table, rows] of Object.entries(seed)) {
      await ensureTable(table, rows || []);
    }
  }

  async function loadAll() {
    db = {};
    for (const table of Object.keys(tableCols)) {
      try {
        const [rows] = await pool.query("SELECT * FROM `" + table + "`");
        db[table] = rows.map((r) => {
          const o = {};
          for (const [k, v] of Object.entries(r)) o[k] = fromDbValue(v);
          return o;
        });
      } catch {
        db[table] = [];
      }
    }
  }

  async function seedIfEmpty() {
    if (db.users && db.users.length) return;
    const seed = seedData();
    for (const [table, rows] of Object.entries(seed)) {
      for (const row of rows) insertSync(table, { ...row });
    }
    await drain();
    await loadAll();
  }

  // ---------- 写（内存即时 + 异步落库） ----------
  function insertSync(table, row) {
    const rows = (db[table] ||= []);
    if (row.id == null) row.id = rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;
    row.createdAt = row.createdAt || now();
    row.updatedAt = row.updatedAt || row.createdAt;
    rows.push(row);
    enqueue(async () => {
      await ensureTable(table, [row]);
      const cols = tableCols[table];
      const keys = cols.filter((c) => row[c] !== undefined);
      const sql = "INSERT INTO `" + table + "` (`" + keys.join("`,`") + "`) VALUES (" + keys.map(() => "?").join(",") + ")";
      await pool.query(sql, keys.map((k) => toDbValue(row[k])));
    });
    return row;
  }

  function updateSync(table, id, patch) {
    const row = getSync(table, id);
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: now() });
    enqueue(async () => {
      await ensureTable(table, row);
      const cols = tableCols[table];
      const keys = cols.filter((c) => c !== "id" && patch[c] !== undefined);
      if (!keys.length) return;
      const sql = "UPDATE `" + table + "` SET " + keys.map((k) => "`" + k + "` = ?").join(", ") + ", `updatedAt` = ? WHERE `id` = ?";
      await pool.query(sql, [...keys.map((k) => toDbValue(patch[k])), now(), id]);
    });
    return row;
  }

  function removeSync(table, id) {
    const rows = db[table] || [];
    const i = rows.findIndex((r) => Number(r.id) === Number(id));
    if (i < 0) return false;
    rows.splice(i, 1);
    enqueue(async () => {
      await pool.query("DELETE FROM `" + table + "` WHERE `id` = ?", [id]);
    });
    return true;
  }

  function removeWhereSync(table, predicate) {
    const rows = db[table] || [];
    const ids = rows.filter(predicate).map((r) => r.id);
    if (!ids.length) return 0;
    db[table] = rows.filter((r) => !ids.includes(r.id));
    enqueue(async () => {
      const marks = ids.map(() => "?").join(",");
      await pool.query("DELETE FROM `" + table + "` WHERE `id` IN (" + marks + ")", ids);
    });
    return ids.length;
  }

  // ---------- 读（同步，内存） ----------
  function all(table) {
    return (db[table] ||= []);
  }
  function getSync(table, id) {
    return all(table).find((r) => Number(r.id) === Number(id)) || null;
  }
  function findSync(table, predicate) {
    return all(table).filter(predicate);
  }
  function findOneSync(table, predicate) {
    return all(table).find(predicate) || null;
  }
  function countSync(table, predicate) {
    const rows = all(table);
    return predicate ? rows.filter(predicate).length : rows.length;
  }
  function nextId(table) {
    return all(table).reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;
  }

  async function drain() {
    await pending;
  }

  async function init() {
    pool = mysql.createPool({
      host: cfg.host || "127.0.0.1",
      port: Number(cfg.port) || 3306,
      user: cfg.user || "root",
      password: cfg.password || "",
      database: cfg.database || "ecommerce",
      connectionLimit: 10,
      waitForConnections: true,
    });
    const conn = await mysql.createConnection({ host: cfg.host || "127.0.0.1", port: Number(cfg.port) || 3306, user: cfg.user || "root", password: cfg.password || "" });
    await conn.query("CREATE DATABASE IF NOT EXISTS `" + (cfg.database || "ecommerce") + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    await conn.end();
    await createTablesFromSeed();
    await loadAll();
    await seedIfEmpty();
    return db;
  }

  async function reset() {
    for (const table of Object.keys(tableCols)) {
      await pool.query("DELETE FROM `" + table + "`");
    }
    db = {};
    await seedIfEmpty();
  }

  async function close() {
    await drain();
    if (pool) await pool.end();
  }

  return {
    init,
    all,
    get: getSync,
    find: findSync,
    findOne: findOneSync,
    count: countSync,
    nextId,
    insert: insertSync,
    update: updateSync,
    remove: removeSync,
    removeWhere: removeWhereSync,
    reset,
    drain,
    close,
    isMySql: true,
  };
}