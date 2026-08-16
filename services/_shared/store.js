import fs from "node:fs";
import path from "node:path";
import config from "./config.js";
import { seedFor } from "./seed.js";
import { now } from "./util.js";

// ============================================================
// 数据访问层（DataStore）—— 每个微服务只持有 OWNED_COLLECTIONS 自有集合
// - 开发/演示：内存 + JSON 文件持久化（每服务独立数据文件）
// - 生产：MySQL 8（表名 = 集合名，各服务集合不重叠，天然表级隔离）
// ============================================================

class JsonStore {
  constructor(file, collections) {
    this.file = file;
    this.collections = collections && collections.length ? collections : null; // null = 全量（monolith）
    this.db = null;
    this._timer = null;
  }

  init() {
    if (this.db) return this.db;
    const seed = seedFor(this.collections);
    if (fs.existsSync(this.file)) {
      try {
        this.db = JSON.parse(fs.readFileSync(this.file, "utf8"));
        // 文件缺自有集合时从种子补齐（新集合首次上线自动建表）
        let changed = false;
        for (const [name, rows] of Object.entries(seed)) {
          if (!this.db[name]) { this.db[name] = rows; changed = true; }
        }
        if (changed) this.save();
        return this.db;
      } catch {
        // 损坏则重建
      }
    }
    this.db = seed;
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
    this.db = seedFor(this.collections);
    this.save();
  }
}

import { createMySqlStore } from "./mysql-store.js";

export function createStore({ collections }) {
  if (config.useMySql) {
    return createMySqlStore({ ...config.db, collections: collections || null });
  }
  return new JsonStore(config.dataFile, collections || null);
}

export const store = createStore({ collections: config.ownedCollections });
export default store;