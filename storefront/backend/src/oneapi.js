const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomString(len) {
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

function generateRedemptionKey() {
  return `ONEAPI-${randomString(25)}`;
}

function db() {
  const conn = new Database(config.oneApiDb, { readonly: false, timeout: 5000 });
  conn.pragma('busy_timeout = 5000');
  return conn;
}

function keyExists(key) {
  const conn = db();
  try {
    const row = conn.prepare('SELECT COUNT(*) AS c FROM redemptions WHERE key = ?').get(key);
    return row.c > 0;
  } finally {
    conn.close();
  }
}

function createRedemption({ name, quota }) {
  const conn = db();
  try {
    let key = generateRedemptionKey();
    let attempts = 0;
    while (keyExists(key) && attempts < 5) {
      key = generateRedemptionKey();
      attempts += 1;
    }
    const now = Math.floor(Date.now() / 1000);
    const info = conn
      .prepare(
        'INSERT INTO redemptions (user_id, key, status, name, quota, created_time, redeemed_time) VALUES (0, ?, 1, ?, ?, ?, NULL)'
      )
      .run(key, name, quota, now);
    return { id: info.lastInsertRowid, key, name, quota };
  } finally {
    conn.close();
  }
}

function listModels() {
  const conn = db();
  try {
    const rows = conn.prepare('SELECT models FROM channels WHERE status = 1').all();
    const set = new Set();
    for (const r of rows) {
      (r.models || '')
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((m) => set.add(m));
    }
    return [...set].sort();
  } finally {
    conn.close();
  }
}

function maskKey(key) {
  if (!key) return '';
  if (key.length <= 10) return key.slice(0, 4) + '***';
  return key.slice(0, 6) + '***' + key.slice(-4);
}

function listTokens(limit = 100) {
  const conn = db();
  try {
    const rows = conn
      .prepare(
        `SELECT t.id, t.user_id, u.username, t.key, t.name, t.status, t.used_quota, t.remain_quota, t.unlimited_quota, t.expired_time, t.created_time
         FROM tokens t LEFT JOIN users u ON u.id = t.user_id
         ORDER BY t.created_time DESC LIMIT ?`
      )
      .all(limit);
    return rows.map((r) => ({
      id: r.id,
      username: r.username || '',
      name: r.name || '',
      key: maskKey(r.key),
      status: r.status,
      usedQuota: r.used_quota,
      remainQuota: r.remain_quota,
      unlimitedQuota: r.unlimited_quota === 1,
      expiredTime: r.expired_time,
      createdTime: r.created_time,
    }));
  } finally {
    conn.close();
  }
}

function listChannels() {
  const conn = db();
  try {
    const rows = conn
      .prepare('SELECT id, name, type, models, status, balance, priority FROM channels ORDER BY id ASC')
      .all();
    return rows.map((r) => ({
      id: r.id,
      name: r.name || '',
      type: r.type || '',
      models: r.models || '',
      status: r.status,
      balance: r.balance || 0,
      priority: r.priority,
    }));
  } finally {
    conn.close();
  }
}

function listUsers() {
  const conn = db();
  try {
    const rows = conn
      .prepare(
        'SELECT id, username, display_name, role, status, quota, used_quota, request_count FROM users ORDER BY id ASC'
      )
      .all();
    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      displayName: r.display_name || '',
      role: r.role,
      status: r.status,
      quota: r.quota,
      usedQuota: r.used_quota,
      requestCount: r.request_count || 0,
    }));
  } finally {
    conn.close();
  }
}

module.exports = { createRedemption, listModels, listTokens, listChannels, listUsers };
