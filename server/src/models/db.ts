import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';

import { buildDemoDataset } from '../demo/seeds';

const IS_NODE_TEST = Boolean(process.env.NODE_TEST_CONTEXT);
const DATA_DIR = process.env.SQLITE_DATA_DIR
  ? path.resolve(process.env.SQLITE_DATA_DIR)
  : IS_NODE_TEST
    ? path.join(process.env.TMPDIR || '/tmp', 'tonglin-swap-tests')
    : path.join(__dirname, '../../data');
const DB_PATH = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : path.join(DATA_DIR, IS_NODE_TEST ? `swap-${process.pid}.db` : 'swap.db');

let db: SqlJsDatabase;

const CURRENT_SCHEMA_VERSION = 14;

type InitOptions = {
  forceReset?: boolean;
};

async function createDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    return new SQL.Database(buffer);
  }

  return new SQL.Database();
}

function tableExists(tableName: string) {
  const row = getOne(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [tableName]
  );
  return Boolean(row);
}

function indexExists(indexName: string) {
  const row = getOne(
    "SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?",
    [indexName]
  );
  return Boolean(row);
}

function columnExists(tableName: string, columnName: string) {
  const rows = query(`PRAGMA table_info(${tableName})`);
  return rows.some((row) => row.name === columnName);
}

function ensureColumn(tableName: string, columnName: string, definition: string) {
  if (!columnExists(tableName, columnName)) {
    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

// 获取当前 schema 版本
function getSchemaVersion(): number {
  if (!tableExists('schema_version')) {
    return 0;
  }
  const row = getOne('SELECT version FROM schema_version ORDER BY id DESC LIMIT 1');
  return row ? Number(row.version) : 0;
}

// 设置 schema 版本
function setSchemaVersion(version: number) {
  run('INSERT INTO schema_version (version, created_at) VALUES (?, datetime("now"))', [version]);
}

// 确保 schema_version 表存在
function ensureSchemaVersionTable() {
  if (!tableExists('schema_version')) {
    db.run(`
      CREATE TABLE IF NOT EXISTS schema_version (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }
}

function ensureSchema() {
  // SQLite 必须手动启用外键支持
  db.run('PRAGMA foreign_keys = ON');

  // 确保 schema_version 表存在
  ensureSchemaVersionTable();

  // 执行 schema 升级
  const currentVersion = getSchemaVersion();

  if (currentVersion < 1) {
    migrateToV1();
  }
  if (currentVersion < 2) {
    migrateToV2();
  }
  if (currentVersion < 3) {
    migrateToV3();
  }
  if (currentVersion < 4) {
    migrateToV4();
  }
  if (currentVersion < 5) {
    migrateToV5();
  }
  if (currentVersion < 6) {
    migrateToV6();
  }
  if (currentVersion < 7) {
    migrateToV7();
  }
  if (currentVersion < 8) {
    migrateToV8();
  }
  if (currentVersion < 9) {
    migrateToV9();
  }
  if (currentVersion < 10) {
    migrateToV10();
  }
  if (currentVersion < 11) {
    migrateToV11();
  }
  if (currentVersion < 12) {
    migrateToV12();
  }
  if (currentVersion < 13) {
    migrateToV13();
  }
  if (currentVersion < 14) {
    migrateToV14();
  }

  // 标记完成
  const newVersion = getSchemaVersion();
  if (newVersion < CURRENT_SCHEMA_VERSION) {
    setSchemaVersion(CURRENT_SCHEMA_VERSION);
  }

  ensureExchangeQueueDefaults();
}

// V1: 初始 schema + 索引
function migrateToV1() {
  console.log('📦 Running database migration to V1...');

  // Users 表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      avatar TEXT DEFAULT '😊',
      phone TEXT DEFAULT '',
      community TEXT DEFAULT '',
      lat REAL,
      lng REAL,
      openid TEXT UNIQUE,
      email TEXT,
      password_hash TEXT,
      reset_code TEXT,
      reset_code_created_at TEXT,
      credit_score REAL DEFAULT 4.8,
      badge TEXT DEFAULT '[]',
      bio TEXT DEFAULT '',
      exchange_count INTEGER DEFAULT 0,
      is_liaison INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0,
      service_agreement_version TEXT DEFAULT '',
      service_agreement_confirmed_at TEXT DEFAULT '',
      service_agreement_source TEXT DEFAULT '',
      district TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Items 表
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      images TEXT NOT NULL DEFAULT '[]',
      category TEXT NOT NULL,
      age_range TEXT NOT NULL,
      exchange_mode TEXT NOT NULL,
      price REAL,
      price_negotiable TEXT DEFAULT '',
      condition TEXT,
      tags TEXT DEFAULT '[]',
      community TEXT DEFAULT '',
      district TEXT DEFAULT '',
      lat REAL,
      lng REAL,
      status TEXT DEFAULT 'available',
      listing_type TEXT DEFAULT 'offer',
      agreement_confirmed INTEGER DEFAULT 0,
      agreement_version TEXT DEFAULT '',
      agreement_confirmed_at TEXT DEFAULT '',
      view_count INTEGER DEFAULT 0,
      favorite_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Messages 表
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Favorites 表
  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, item_id)
    )
  `);

  // Exchanges 表
  db.run(`
    CREATE TABLE IF NOT EXISTS exchanges (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      requester_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Notifications 表
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      related_item_id TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Auth codes 表
  db.run(`
    CREATE TABLE IF NOT EXISTS auth_codes (
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT NOT NULL,
      expires_at TEXT,
      attempts INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (email, type)
    )
  `);

  // Review queue 表
  db.run(`
    CREATE TABLE IF NOT EXISTS review_queue (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      title TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      owner_nickname TEXT DEFAULT '',
      community TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      status TEXT DEFAULT 'submitted',
      provider TEXT DEFAULT 'local',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Feedback entries 表
  db.run(`
    CREATE TABLE IF NOT EXISTS feedback_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT '',
      user_email TEXT DEFAULT '',
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      contact TEXT DEFAULT '',
      provider TEXT DEFAULT 'local',
      status TEXT DEFAULT 'submitted',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  saveDb();
  console.log('✅ V1 migration complete');
}

// V2: 添加索引
function migrateToV2() {
  console.log('📦 Running database migration to V2 (adding indexes)...');

  // Users 索引 - 先清理重复数据再创建唯一索引
  try {
    // 将重复的 phone 设为空（保留一条）
    db.run(`
      UPDATE users SET phone = '' WHERE id IN (
        SELECT id FROM users WHERE phone != '' AND phone IN (
          SELECT phone FROM users GROUP BY phone HAVING COUNT(*) > 1
        ) AND id NOT IN (
          SELECT MIN(id) FROM users WHERE phone != '' GROUP BY phone HAVING COUNT(*) > 1
        )
      )
    `);
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone != ''`);
  } catch (e) {
    console.warn('⚠️ idx_users_phone 创建失败（可能已存在）:', (e as Error).message);
  }

  try {
    // 将重复的 email 设为空
    db.run(`
      UPDATE users SET email = '' WHERE id IN (
        SELECT id FROM users WHERE email != '' AND email IN (
          SELECT email FROM users GROUP BY email HAVING COUNT(*) > 1
        ) AND id NOT IN (
          SELECT MIN(id) FROM users WHERE email != '' GROUP BY email HAVING COUNT(*) > 1
        )
      )
    `);
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email != ''`);
  } catch (e) {
    console.warn('⚠️ idx_users_email 创建失败（可能已存在）:', (e as Error).message);
  }

  // Items 索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_items_status ON items(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_items_listing_type ON items(listing_type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)`);

  // Messages 索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_item_id ON messages(item_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id)`);

  // Favorites 索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_favorites_item_id ON favorites(item_id)`);

  // Exchanges 索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_exchanges_item_id ON exchanges(item_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_exchanges_requester ON exchanges(requester_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_exchanges_owner ON exchanges(owner_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_exchanges_status ON exchanges(status)`);

  // Notifications 索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)`);

  // Review queue 索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue(status)`);

  saveDb();
  console.log('✅ V2 migration complete (indexes added)');
}

// V3: 用户画像字段 + 行为记录表
function migrateToV3() {
  console.log('📦 Running database migration to V3 (user profile + behavior tracking)...');

  // 用户画像字段
  ensureColumn('users', 'child_age_ranges', "TEXT DEFAULT '[]'");
  ensureColumn('users', 'child_count', "INTEGER DEFAULT 0");

  // 浏览记录表
  if (!tableExists('view_logs')) {
    db.run(`
      CREATE TABLE IF NOT EXISTS view_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        category TEXT DEFAULT '',
        age_range TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  // 搜索关键词记录表
  if (!tableExists('search_logs')) {
    db.run(`
      CREATE TABLE IF NOT EXISTS search_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT DEFAULT '',
        keyword TEXT NOT NULL,
        result_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  // 浏览记录索引
  try { db.run(`CREATE INDEX IF NOT EXISTS idx_view_logs_user_id ON view_logs(user_id)`); } catch {}
  try { db.run(`CREATE INDEX IF NOT EXISTS idx_view_logs_item_id ON view_logs(item_id)`); } catch {}
  try { db.run(`CREATE INDEX IF NOT EXISTS idx_view_logs_category ON view_logs(category)`); } catch {}
  try { db.run(`CREATE INDEX IF NOT EXISTS idx_view_logs_created_at ON view_logs(created_at)`); } catch {}

  // 搜索记录索引
  try { db.run(`CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON search_logs(user_id)`); } catch {}
  try { db.run(`CREATE INDEX IF NOT EXISTS idx_search_logs_keyword ON search_logs(keyword)`); } catch {}
  try { db.run(`CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at)`); } catch {}

  saveDb();
  console.log('✅ V3 migration complete (user profile + behavior tracking)');
}

// V4: 用户状态字段（active/muted/deactivated）
function migrateToV4() {
  console.log('📦 Running database migration to V4 (user status)...');

  // 用户状态字段：active=正常, muted=禁言, deactivated=注销
  ensureColumn('users', 'status', "TEXT DEFAULT 'active'");
  ensureColumn('users', 'status_reason', "TEXT DEFAULT ''");
  ensureColumn('users', 'status_updated_at', "TEXT DEFAULT ''");

  // 用户状态索引
  try { db.run(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`); } catch {}

  saveDb();
  console.log('✅ V4 migration complete (user status field)');
}

// V5: 交换状态机扩展（cancelled/failed + 时间/操作者字段）
function migrateToV5() {
  console.log('📦 Running database migration to V5 (exchange status machine)...');

  // exchanges 表新增字段
  ensureColumn('exchanges', 'updated_at', "TEXT DEFAULT ''");
  ensureColumn('exchanges', 'completed_at', "TEXT DEFAULT ''");
  ensureColumn('exchanges', 'cancelled_by', "TEXT DEFAULT ''");
  ensureColumn('exchanges', 'cancelled_at', "TEXT DEFAULT ''");
  ensureColumn('exchanges', 'failed_at', "TEXT DEFAULT ''");
  ensureColumn('exchanges', 'fail_reason', "TEXT DEFAULT ''");

  saveDb();
  console.log('✅ V5 migration complete (exchange status machine)');
}

// V6: 通知撤回字段
function migrateToV6() {
  console.log('📦 Running database migration to V6 (notification recall)...');

  // notifications 表新增撤回字段
  ensureColumn('notifications', 'recalled', "INTEGER DEFAULT 0");

  saveDb();
  console.log('✅ V6 migration complete (notification recall field)');
}

// V7: 预约候补队列（pending 当前锁定，waiting 候补，expired 超时释放）
function migrateToV7() {
  console.log('📦 Running database migration to V7 (exchange waitlist queue)...');

  ensureColumn('exchanges', 'queue_position', 'INTEGER DEFAULT 1');
  ensureColumn('exchanges', 'active_until', "TEXT DEFAULT ''");
  ensureColumn('exchanges', 'promoted_at', "TEXT DEFAULT ''");
  ensureColumn('exchanges', 'reminder_sent_at', "TEXT DEFAULT ''");
  ensureColumn('exchanges', 'expired_at', "TEXT DEFAULT ''");

  try { db.run(`CREATE INDEX IF NOT EXISTS idx_exchanges_queue ON exchanges(item_id, status, queue_position, created_at)`); } catch {}

  saveDb();
  console.log('✅ V7 migration complete (exchange waitlist queue)');
}

// V8: 发布协议确认留痕
function migrateToV8() {
  console.log('📦 Running database migration to V8 (publish agreement audit)...');

  ensureColumn('items', 'agreement_confirmed', 'INTEGER DEFAULT 0');
  ensureColumn('items', 'agreement_version', "TEXT DEFAULT ''");
  ensureColumn('items', 'agreement_confirmed_at', "TEXT DEFAULT ''");

  try { db.run(`CREATE INDEX IF NOT EXISTS idx_items_agreement_confirmed ON items(agreement_confirmed)`); } catch {}

  saveDb();
  console.log('✅ V8 migration complete (publish agreement audit)');
}

// V9: 价格说明（是否一口价/可协商）
function migrateToV9() {
  console.log('📦 Running database migration to V9 (price negotiation note)...');

  ensureColumn('items', 'price_negotiable', "TEXT DEFAULT ''");

  saveDb();
  console.log('✅ V9 migration complete (price negotiation note)');
}

// V10: 账号级服务协议确认留痕
function migrateToV10() {
  console.log('📦 Running database migration to V10 (account service agreement audit)...');

  ensureColumn('users', 'service_agreement_version', "TEXT DEFAULT ''");
  ensureColumn('users', 'service_agreement_confirmed_at', "TEXT DEFAULT ''");
  ensureColumn('users', 'service_agreement_source', "TEXT DEFAULT ''");

  try { db.run(`CREATE INDEX IF NOT EXISTS idx_users_service_agreement ON users(service_agreement_version)`); } catch {}

  saveDb();
  console.log('✅ V10 migration complete (account service agreement audit)');
}

// V11: 服务协议版本化内容管理
function migrateToV11() {
  console.log('📦 Running database migration to V11 (service agreement content versions)...');

  if (!tableExists('service_agreements')) {
    db.run(`
      CREATE TABLE IF NOT EXISTS service_agreements (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        content_json TEXT NOT NULL,
        source TEXT DEFAULT 'admin',
        note TEXT DEFAULT '',
        published_by TEXT DEFAULT '',
        published_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  try { db.run(`CREATE INDEX IF NOT EXISTS idx_service_agreements_published_at ON service_agreements(published_at)`); } catch {}

  saveDb();
  console.log('✅ V11 migration complete (service agreement content versions)');
}

// V12: 反馈处理与站内回复留痕
function migrateToV12() {
  console.log('📦 Running database migration to V12 (feedback admin replies)...');

  ensureColumn('feedback_entries', 'admin_reply', "TEXT DEFAULT ''");
  ensureColumn('feedback_entries', 'replied_by', "TEXT DEFAULT ''");
  ensureColumn('feedback_entries', 'replied_at', "TEXT DEFAULT ''");
  ensureColumn('feedback_entries', 'handled_at', "TEXT DEFAULT ''");

  try { db.run(`CREATE INDEX IF NOT EXISTS idx_feedback_entries_status ON feedback_entries(status)`); } catch {}
  try { db.run(`CREATE INDEX IF NOT EXISTS idx_feedback_entries_user_id ON feedback_entries(user_id)`); } catch {}

  saveDb();
  console.log('✅ V12 migration complete (feedback admin replies)');
}

// V13: 用户手机号/邮箱唯一索引仅约束非空值
function migrateToV13() {
  console.log('📦 Running database migration to V13 (partial user contact unique indexes)...');

  try { db.run('DROP INDEX IF EXISTS idx_users_phone'); } catch {}
  try { db.run('DROP INDEX IF EXISTS idx_users_email'); } catch {}
  try { db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone != ''`); } catch {}
  try { db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email != ''`); } catch {}

  saveDb();
  console.log('✅ V13 migration complete (partial user contact unique indexes)');
}

// V14: 内容删除原因与管理员处理留痕
function migrateToV14() {
  console.log('📦 Running database migration to V14 (item moderation audit)...');

  ensureColumn('items', 'delete_reason', "TEXT DEFAULT ''");
  ensureColumn('items', 'deleted_by', "TEXT DEFAULT ''");
  ensureColumn('items', 'deleted_at', "TEXT DEFAULT ''");

  try { db.run(`CREATE INDEX IF NOT EXISTS idx_items_deleted_at ON items(deleted_at)`); } catch {}

  saveDb();
  console.log('✅ V14 migration complete (item moderation audit)');
}

function ensureExchangeQueueDefaults() {
  if (!tableExists('exchanges') || !columnExists('exchanges', 'queue_position')) return;

  const activeUntil = new Date(Date.now() + 48 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);
  try {
    db.run("UPDATE exchanges SET queue_position = 1 WHERE status = 'pending' AND (queue_position IS NULL OR queue_position < 1)");
    db.run("UPDATE exchanges SET active_until = ? WHERE status = 'pending' AND (active_until IS NULL OR active_until = '')", [activeUntil]);
  } catch (error) {
    console.warn('⚠️ exchange queue defaults repair failed:', (error as Error).message);
  }
}

function clearDemoTables() {
  // 禁用外键约束以便清空表
  db.run('PRAGMA foreign_keys = OFF');
  const tables = ['feedback_entries', 'review_queue', 'auth_codes', 'notifications', 'exchanges', 'favorites', 'messages', 'items', 'users', 'service_agreements'];
  for (const tableName of tables) {
    if (tableExists(tableName)) {
      db.run(`DELETE FROM ${tableName}`);
    }
  }
  db.run('PRAGMA foreign_keys = ON');
}

function execute(sql: string, params: unknown[] = []) {
  db.run(sql, params as never[]);
}

export async function resetDemoData() {
  clearDemoTables();

  const { users, items, messages, exchanges, notifications } = buildDemoDataset();

  for (const user of users) {
    execute(
      `INSERT INTO users
        (id, nickname, avatar, community, lat, lng, bio, credit_score, exchange_count, is_liaison, badge)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.nickname,
        user.avatar,
        user.community,
        user.lat,
        user.lng,
        user.bio,
        user.creditScore,
        user.exchangeCount,
        user.isLiaison ? 1 : 0,
        JSON.stringify(user.badges),
      ]
    );
  }

  for (const item of items) {
    execute(
      `INSERT INTO items
        (id, user_id, title, description, images, category, age_range, exchange_mode, price, condition, tags, community, lat, lng, status, created_at, view_count, favorite_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.userId,
        item.title,
        item.description,
        JSON.stringify(item.images),
        item.category,
        item.ageRange,
        item.exchangeMode,
        item.price,
        item.condition,
        JSON.stringify(item.tags),
        item.community,
        item.lat,
        item.lng,
        item.status,
        item.createdAt,
        item.viewCount,
        item.favoriteCount,
      ]
    );
  }

  for (const message of messages) {
    execute(
      `INSERT INTO messages
        (id, item_id, from_user_id, to_user_id, content, read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.itemId,
        message.fromUserId,
        message.toUserId,
        message.content,
        message.read ? 1 : 0,
        message.createdAt,
      ]
    );
  }

  for (const exchange of exchanges) {
    execute(
      `INSERT INTO exchanges
        (id, item_id, requester_id, owner_id, status, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        exchange.id,
        exchange.itemId,
        exchange.requesterId,
        exchange.ownerId,
        exchange.status,
        exchange.message,
        exchange.createdAt,
      ]
    );
  }

  for (const notification of notifications) {
    execute(
      `INSERT INTO notifications
        (id, user_id, type, title, content, related_item_id, read, recalled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        notification.id,
        notification.userId,
        notification.type,
        notification.title,
        notification.content,
        notification.relatedItemId,
        notification.read ? 1 : 0,
        notification.recalled ? 1 : 0,
        notification.createdAt,
      ]
    );
  }

  saveDb();
}

export async function initDatabase(options: InitOptions = {}) {
  db = await createDatabase();
  ensureSchema();

  const row = getOne('SELECT COUNT(*) as count FROM users');
  if (options.forceReset || Number(row?.count ?? 0) === 0) {
    if (process.env.NODE_ENV === 'production' && !options.forceReset) {
      saveDb();
    } else {
      await resetDemoData();
    }
  } else {
    saveDb();
  }

  return db;
}

export function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export function getOne(sql: string, params: unknown[] = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params as never[]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function query(sql: string, params: unknown[] = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params as never[]);
  const rows: Array<Record<string, unknown>> = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as Record<string, unknown>);
  }
  stmt.free();
  return rows;
}

export function run(sql: string, params: unknown[] = []) {
  execute(sql, params);
  saveDb();
}

export { db, uuid };
