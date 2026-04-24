import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';

import { buildDemoDataset } from '../demo/seeds';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'swap.db');

let db: SqlJsDatabase;

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

function columnExists(tableName: string, columnName: string) {
  const rows = query(`PRAGMA table_info(${tableName})`);
  return rows.some((row) => row.name === columnName);
}

function ensureColumn(tableName: string, columnName: string, definition: string) {
  if (!columnExists(tableName, columnName)) {
    console.log(`[DB] ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function ensureSchema() {
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
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  ensureColumn('users', 'bio', "TEXT DEFAULT ''");
  ensureColumn('users', 'exchange_count', 'INTEGER DEFAULT 0');
  ensureColumn('users', 'is_liaison', 'INTEGER DEFAULT 0');
  ensureColumn('users', 'is_admin', 'INTEGER DEFAULT 0');
  ensureColumn('users', 'email', 'TEXT');
  ensureColumn('users', 'password_hash', 'TEXT');
  ensureColumn('users', 'reset_code', 'TEXT');
  ensureColumn('users', 'reset_code_created_at', 'TEXT');
  ensureColumn('users', 'district', "TEXT DEFAULT ''");
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email)`);

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
      condition TEXT,
      tags TEXT DEFAULT '[]',
      community TEXT DEFAULT '',
      lat REAL,
      lng REAL,
      status TEXT DEFAULT 'available',
      view_count INTEGER DEFAULT 0,
      favorite_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  ensureColumn('items', 'district', "TEXT DEFAULT ''");
  ensureColumn('items', 'listing_type', "TEXT DEFAULT 'offer'");

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

  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, item_id)
    )
  `);

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

  db.run(`
    CREATE TABLE IF NOT EXISTS auth_codes (
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT NOT NULL,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (email, type)
    )
  `);

  ensureColumn('auth_codes', 'expires_at', 'TEXT');

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
}

function clearDemoTables() {
  const tables = ['feedback_entries', 'review_queue', 'auth_codes', 'notifications', 'exchanges', 'favorites', 'messages', 'items', 'users'];
  for (const tableName of tables) {
    if (tableExists(tableName)) {
      db.run(`DELETE FROM ${tableName}`);
    }
  }
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
        (id, user_id, type, title, content, related_item_id, read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        notification.id,
        notification.userId,
        notification.type,
        notification.title,
        notification.content,
        notification.relatedItemId,
        notification.read ? 1 : 0,
        notification.createdAt,
      ]
    );
  }

  saveDb();
}

function logDbState(label: string) {
  try {
    const total = getOne('SELECT COUNT(*) as c FROM items')?.c ?? 0;
    let wanted = 0, offer = 0;
    try {
      const rows = query('SELECT listing_type FROM items');
      for (const r of rows) {
        if ((r as Record<string,unknown>).listing_type === 'wanted') wanted++;
        else offer++;
      }
    } catch(e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      wanted = -1; offer = -1;
      console.log(`[DB] ${label} - listing_type query failed: ${err}`);
    }
    console.log(`[DB] ${label} - items: total=${total}, wanted=${wanted}, offer=${offer}`);
  } catch(e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    console.log(`[DB] ${label} - logDbState failed: ${err}`);
  }
}

export async function initDatabase(options: InitOptions = {}) {
  db = await createDatabase();
  logDbState('After createDatabase (from file)');
  ensureSchema();
  logDbState('After ensureSchema');

  const row = getOne('SELECT COUNT(*) as count FROM users');
  if (options.forceReset || Number(row?.count ?? 0) === 0) {
    await resetDemoData();
    logDbState('After resetDemoData');
  } else {
    saveDb();
    logDbState('After saveDb (existing DB)');
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
