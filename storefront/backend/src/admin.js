const crypto = require('crypto');
const mysql = require('mysql2/promise');
const config = require('./config');

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.mysqlHost,
      port: config.mysqlPort,
      user: config.mysqlUser,
      password: config.mysqlPassword,
      database: config.mysqlDatabase,
      connectionLimit: 4,
      waitForConnections: true,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function init() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(64) NOT NULL UNIQUE,
      pass_hash VARCHAR(200) NOT NULL,
      is_super INT DEFAULT 0,
      created_at BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token VARCHAR(64) PRIMARY KEY,
      user_id INT NOT NULL,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS product_overrides (
      product_id VARCHAR(80) PRIMARY KEY,
      price_usd DOUBLE NULL,
      enabled INT DEFAULT 1,
      updated_at BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const admins = await query('SELECT COUNT(*) AS n FROM admin_users');
  if (admins[0].n === 0) {
    const password = process.env.ADMIN_INITIAL_PASSWORD || 'DaqiAPI@2026';
    await query(
      'INSERT INTO admin_users (username, pass_hash, is_super, created_at) VALUES (?, ?, 1, ?)',
      ['admin', hashPassword(password), Date.now()]
    );
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const calc = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(calc, 'hex'));
}

const loginAttempts = new Map();

async function login(username, password) {
  const key = String(username || '').toLowerCase();
  const now = Date.now();
  const rec = loginAttempts.get(key) || { fails: 0, lockUntil: 0 };
  if (rec.lockUntil > now) return { error: 'LOCKED' };

  const rows = await query('SELECT * FROM admin_users WHERE username = ?', [String(username || '').trim()]);
  const admin = rows[0];
  if (!admin || !verifyPassword(password || '', admin.pass_hash)) {
    rec.fails += 1;
    if (rec.fails >= 5) rec.lockUntil = now + 15 * 60 * 1000;
    loginAttempts.set(key, rec);
    return { error: 'BAD_CREDENTIALS' };
  }
  loginAttempts.delete(key);

  const token = crypto.randomBytes(32).toString('hex');
  const expires = now + 24 * 60 * 60 * 1000;
  await query(
    'INSERT INTO admin_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    [token, admin.id, now, expires]
  );
  return {
    token,
    user: { id: admin.id, username: admin.username, is_super: admin.is_super === 1 },
  };
}

async function auth(token) {
  if (!token) return null;
  const rows = await query(
    `SELECT a.* FROM admin_sessions s JOIN admin_users a ON a.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
    [token, Date.now()]
  );
  return rows[0] || null;
}

async function logout(token) {
  if (token) await query('DELETE FROM admin_sessions WHERE token = ?', [token]);
}

async function listOverrides() {
  const rows = await query('SELECT product_id, price_usd, enabled FROM product_overrides');
  const map = {};
  rows.forEach((r) => {
    map[r.product_id] = { priceUsd: r.price_usd === null ? null : Number(r.price_usd), enabled: r.enabled === 1 };
  });
  return map;
}

async function setOverride(productId, { priceUsd, enabled }) {
  const price = priceUsd === undefined || priceUsd === null || priceUsd === '' ? null : Number(priceUsd);
  const en = enabled === undefined ? 1 : enabled ? 1 : 0;
  if (price !== null && (!Number.isFinite(price) || price <= 0)) return { error: 'PRICE_INVALID' };
  await query(
    `INSERT INTO product_overrides (product_id, price_usd, enabled, updated_at) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE price_usd = VALUES(price_usd), enabled = VALUES(enabled), updated_at = VALUES(updated_at)`,
    [productId, price, en, Date.now()]
  );
  return { productId, priceUsd: price, enabled: en === 1 };
}

module.exports = {
  init,
  login,
  auth,
  logout,
  listOverrides,
  setOverride,
  verifyPassword,
  hashPassword,
  query,
};
