import fs from "node:fs";
import path from "node:path";
import config from "./config.js";
import { seedData } from "./seed.js";
import { now } from "./util.js";

// ============================================================
// 数据访问层（DataStore）
// - 开发/演示模式：内存 + JSON 文件持久化（零依赖，开箱即用）
// - 生产模式：MySQL（db/schema.sql 提供完整 DDL 与索引），
//   通过实现相同接口的 MySqlStore 替换（见 docs/database.md）
// ============================================================

class JsonStore {
  constructor(file) {
    this.file = file;
    this.db = null;
    this._timer = null;
  }

  init() {
    if (this.db) return this.db;
    if (fs.existsSync(this.file)) {
      try {
        this.db = JSON.parse(fs.readFileSync(this.file, "utf8"));
        return this.db;
      } catch {
        // 损坏则重建
      }
    }
    this.db = seedData();
    this.save();
    return this.db;
  }

  save() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      try {
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        fs.writeFileSync(this.file, JSON.stringify(this.db, null, 2));
      } catch (e) {
        console.error("[store] save failed:", e.message);
      }
    }, 200);
  }

  // ---- 通用集合操作 ----
  all(name) {
    this.init();
    return (this.db[name] ||= []);
  }

  nextId(name) {
    const rows = this.all(name);
    return rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;
  }

  insert(name, row) {
    const rows = this.all(name);
    row.id = row.id || this.nextId(name);
    row.createdAt = row.createdAt || now();
    row.updatedAt = row.updatedAt || row.createdAt;
    rows.push(row);
    this.save();
    return row;
  }

  get(name, id) {
    return this.all(name).find((r) => Number(r.id) === Number(id)) || null;
  }

  find(name, predicate) {
    return this.all(name).filter(predicate);
  }

  findOne(name, predicate) {
    return this.all(name).find(predicate) || null;
  }

  update(name, id, patch) {
    const row = this.get(name, id);
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: now() });
    this.save();
    return row;
  }

  remove(name, id) {
    const rows = this.all(name);
    const i = rows.findIndex((r) => Number(r.id) === Number(id));
    if (i < 0) return false;
    rows.splice(i, 1);
    this.save();
    return true;
  }

  removeWhere(name, predicate) {
    const rows = this.all(name);
    const keep = rows.filter((r) => !predicate(r));
    const removed = rows.length - keep.length;
    if (removed) {
      this.db[name] = keep;
      this.save();
    }
    return removed;
  }

  count(name, predicate) {
    const rows = this.all(name);
    return predicate ? rows.filter(predicate).length : rows.length;
  }

  reset() {
    this.db = seedData();
    this.save();
  }
}

import { createMySqlStore } from "./mysql-store.js";

export const store = config.useMySql
  ? createMySqlStore({ host: process.env.DB_HOST || "127.0.0.1", port: process.env.DB_PORT || 3306, user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "ecommerce" })
  : new JsonStore(config.dataFile);
export default store;