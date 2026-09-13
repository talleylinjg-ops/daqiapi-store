const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'forum.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    pass_hash TEXT NOT NULL,
    is_mod INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    position INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    pinned INTEGER DEFAULT 0,
    closed INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_reply_at INTEGER NOT NULL,
    last_reply_by INTEGER
  );
  CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

const DEFAULT_CATEGORIES = [
  { slug: 'announcements', name: 'Announcements', description: 'Official news and product updates from DaqiAPI.', position: 0 },
  { slug: 'products', name: 'Product Discussion', description: 'Talk about Token, eSIM and VPN offerings.', position: 1 },
  { slug: 'support', name: 'Support & Help', description: 'Get help with orders, redemption and configuration.', position: 2 },
  { slug: 'feedback', name: 'Feedback & Suggestions', description: 'Share ideas for new features and improvements.', position: 3 },
  { slug: 'off-topic', name: 'Off Topic', description: 'Relaxed community talk about anything else.', position: 4 },
];

const SEED_TOPIC = {
  title: 'Welcome to the DaqiAPI Forum',
  content:
    'Welcome to the official DaqiAPI community forum.\n\nPlease read these quick rules before posting:\n\n1. Be respectful and constructive. No harassment, hate speech or spam.\n2. Help each other with orders, redemption and configuration questions.\n3. Do not post personal order details, credentials or API keys publicly.\n4. Feature requests belong in Feedback & Suggestions.\n\nEnjoy the community!',
};

const BLOCKED_WORDS = [
  'casino', 'viagra', 'crypto', 'bitcoin', 'buy followers',
  'cheap followers', 'win money', 'get rich', 'loan', 'pharmacy',
];

function sanitize(str) {
  return String(str || '').trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}

function spamScore(text) {
  let score = 0;
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const upper = text.replace(/[^A-Z]/g, '').length;
  const letters = text.replace(/[^a-zA-Z]/g, '').length || 1;
  if (BLOCKED_WORDS.some((w) => lower.includes(w))) score += 5;
  const urlMatches = (text.match(/https?:\/\/|www\./gi) || []).length;
  if (urlMatches > 3) score += 2;
  if (words.length > 120) score += 1;
  if (upper / letters > 0.6) score += 2;
  if (/[!]{3,}|\*{2,}/.test(text)) score += 1;
  return score;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const calc = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(calc, 'hex'));
}

function init() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  if (count === 0) {
    const ins = db.prepare('INSERT INTO categories (slug, name, description, position) VALUES (?, ?, ?, ?)');
    DEFAULT_CATEGORIES.forEach((c) => ins.run(c.slug, c.name, c.description, c.position));
  }

  let official = db.prepare('SELECT * FROM users WHERE username = ?').get('DaqiAPI');
  if (!official) {
    const info = db.prepare(
      'INSERT INTO users (username, pass_hash, is_mod, created_at) VALUES (?, ?, 1, ?)'
    ).run('DaqiAPI', hashPassword(crypto.randomBytes(16).toString('hex')), Date.now());
    official = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  }

  const topicCount = db.prepare('SELECT COUNT(*) AS n FROM topics').get().n;
  if (topicCount === 0) {
    const cat = db.prepare('SELECT * FROM categories WHERE slug = ?').get('announcements');
    if (cat) {
      createTopic(official.id, cat.id, SEED_TOPIC.title, SEED_TOPIC.content, true);
    }
  }
}

function publicUser(u) {
  return { id: u.id, username: u.username, is_mod: u.is_mod === 1, created_at: u.created_at };
}

function register(username, password) {
  const user = sanitize(username);
  if (!/^[a-zA-Z0-9_\-]{3,30}$/.test(user)) return { error: 'USERNAME_INVALID' };
  if (String(password || '').length < 6) return { error: 'PASSWORD_LENGTH' };
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(user);
  if (exists) return { error: 'USERNAME_TAKEN' };
  const info = db.prepare(
    'INSERT INTO users (username, pass_hash, is_mod, created_at) VALUES (?, ?, 0, ?)'
  ).run(user, hashPassword(password), Date.now());
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = issueToken(u.id);
  return { user: publicUser(u), token };
}

function login(username, password) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(sanitize(username));
  if (!user || !verifyPassword(password || '', user.pass_hash)) return { error: 'BAD_CREDENTIALS' };
  const token = issueToken(user.id);
  return { user: publicUser(user), token };
}

function issueToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, userId, Date.now());
  return token;
}

function auth(token) {
  if (!token) return null;
  const row = db.prepare(
    'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?'
  ).get(token);
  return row || null;
}

function logout(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

const rateLimit = new Map();

function rateCheck(ip, key) {
  const now = Date.now();
  const rl = rateLimit.get(key) || [];
  const recent = rl.filter((t) => now - t < 3600000);
  if (recent.length >= 10) return { error: 'RATE_LIMIT' };
  if (recent.length && now - recent[recent.length - 1] < 15000) return { error: 'RATE_LIMIT' };
  rateLimit.set(key, [...recent, now]);
  return { ok: true };
}

function validatePost(content, title, ip) {
  const contentClean = sanitize(content);
  if (contentClean.length < 2 || contentClean.length > 4000) return { error: 'CONTENT_LENGTH' };
  if (spamScore(contentClean) >= 3) return { error: 'SPAM' };
  if (title) {
    const titleClean = sanitize(title);
    if (titleClean.length < 3 || titleClean.length > 120) return { error: 'TITLE_LENGTH' };
    if (/https?:\/\/|www\./i.test(titleClean)) return { error: 'SPAM' };
    return { content: contentClean, title: titleClean };
  }
  return { content: contentClean };
}

function listCategories() {
  const rows = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM topics t WHERE t.category_id = c.id) AS topics,
      (SELECT COUNT(*) FROM replies r JOIN topics t ON t.id = r.topic_id WHERE t.category_id = c.id) AS replies,
      (SELECT t.id FROM topics t WHERE t.category_id = c.id ORDER BY t.last_reply_at DESC LIMIT 1) AS last_topic_id,
      (SELECT t.title FROM topics t WHERE t.category_id = c.id ORDER BY t.last_reply_at DESC LIMIT 1) AS last_topic_title,
      (SELECT t.last_reply_at FROM topics t WHERE t.category_id = c.id ORDER BY t.last_reply_at DESC LIMIT 1) AS last_post_at
    FROM categories c
    ORDER BY c.position ASC
  `).all();
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    topics: r.topics,
    replies: r.replies,
    lastTopic: r.last_topic_id
      ? { id: r.last_topic_id, title: r.last_topic_title, lastReplyAt: r.last_post_at }
      : null,
  }));
}

function listTopics(categoryId, page = 1) {
  const pageSize = 20;
  const total = db.prepare('SELECT COUNT(*) AS n FROM topics WHERE category_id = ?').get(categoryId).n;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (Math.max(1, Math.min(page, pages)) - 1) * pageSize;
  const rows = db.prepare(`
    SELECT t.*, u.username AS author_name, lu.username AS last_author,
      (SELECT COUNT(*) FROM replies r WHERE r.topic_id = t.id) AS replies
    FROM topics t
    JOIN users u ON u.id = t.user_id
    LEFT JOIN users lu ON lu.id = t.last_reply_by
    WHERE t.category_id = ?
    ORDER BY t.pinned DESC, t.last_reply_at DESC
    LIMIT ? OFFSET ?
  `).all(categoryId, pageSize, start);
  return {
    topics: rows.map((t) => ({
      id: t.id,
      title: t.title,
      author: t.author_name,
      replies: t.replies,
      views: t.views,
      pinned: t.pinned === 1,
      closed: t.closed === 1,
      createdAt: t.created_at,
      lastReplyAt: t.last_reply_at,
      lastAuthor: t.last_author || null,
    })),
    total,
    page: Math.max(1, Math.min(page, pages)),
    pages,
  };
}

function getTopic(topicId, page = 1) {
  const topic = db.prepare(`
    SELECT t.*, u.username AS author_name, c.id AS category_id, c.name AS category_name
    FROM topics t
    JOIN users u ON u.id = t.user_id
    JOIN categories c ON c.id = t.category_id
    WHERE t.id = ?
  `).get(topicId);
  if (!topic) return null;
  db.prepare('UPDATE topics SET views = views + 1 WHERE id = ?').run(topicId);

  const pageSize = 50;
  const total = db.prepare('SELECT COUNT(*) AS n FROM replies WHERE topic_id = ?').get(topicId).n;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (Math.max(1, Math.min(page, pages)) - 1) * pageSize;
  const replies = db.prepare(`
    SELECT r.*, u.username AS author_name
    FROM replies r JOIN users u ON u.id = r.user_id
    WHERE r.topic_id = ?
    ORDER BY r.created_at ASC
    LIMIT ? OFFSET ?
  `).all(topicId, pageSize, start);

  return {
    topic: {
      id: topic.id,
      title: topic.title,
      content: topic.content,
      author: topic.author_name,
      pinned: topic.pinned === 1,
      closed: topic.closed === 1,
      views: topic.views,
      createdAt: topic.created_at,
      category: { id: topic.category_id, name: topic.category_name },
    },
    replies: replies.map((r) => ({
      id: r.id,
      content: r.content,
      author: r.author_name,
      createdAt: r.created_at,
    })),
    total,
    page: Math.max(1, Math.min(page, pages)),
    pages,
  };
}

function createTopic(userId, categoryId, title, content, isSeed = false) {
  const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
  if (!cat) return { error: 'CATEGORY_NOT_FOUND' };
  const now = Date.now();
  const info = db.prepare(`
    INSERT INTO topics (category_id, title, content, user_id, pinned, closed, views, created_at, last_reply_at, last_reply_by)
    VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?, ?)
  `).run(categoryId, title, content, userId, now, now, isSeed ? userId : null);
  return { id: Number(info.lastInsertRowid) };
}

function createReply(userId, topicId, content) {
  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId);
  if (!topic) return { error: 'TOPIC_NOT_FOUND' };
  if (topic.closed === 1) return { error: 'TOPIC_CLOSED' };
  const now = Date.now();
  const info = db.prepare(
    'INSERT INTO replies (topic_id, user_id, content, created_at) VALUES (?, ?, ?, ?)'
  ).run(topicId, userId, content, now);
  db.prepare('UPDATE topics SET last_reply_at = ?, last_reply_by = ? WHERE id = ?').run(now, userId, topicId);
  return { id: Number(info.lastInsertRowid) };
}

function modAction(topicId, patch) {
  const topic = db.prepare('SELECT id FROM topics WHERE id = ?').get(topicId);
  if (!topic) return null;
  db.prepare(`UPDATE topics SET ${patch} WHERE id = ?`).run(topicId);
  return { id: Number(topicId) };
}

function deleteTopic(topicId) {
  const topic = db.prepare('SELECT id FROM topics WHERE id = ?').get(topicId);
  if (!topic) return null;
  db.prepare('DELETE FROM replies WHERE topic_id = ?').run(topicId);
  db.prepare('DELETE FROM topics WHERE id = ?').run(topicId);
  return { id: Number(topicId) };
}

function deleteReply(replyId) {
  const reply = db.prepare('SELECT * FROM replies WHERE id = ?').get(replyId);
  if (!reply) return null;
  db.prepare('DELETE FROM replies WHERE id = ?').run(replyId);
  const last = db.prepare(
    'SELECT id, created_at FROM replies WHERE topic_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(reply.topic_id);
  if (last) {
    db.prepare('UPDATE topics SET last_reply_at = ?, last_reply_by = (SELECT user_id FROM replies WHERE id = ?) WHERE id = ?').run(last.created_at, last.id, reply.topic_id);
  } else {
    db.prepare('UPDATE topics SET last_reply_at = created_at, last_reply_by = user_id WHERE id = ?').run(reply.topic_id);
  }
  return { id: Number(replyId) };
}

function listAllTopics(page = 1) {
  const pageSize = 30;
  const total = db.prepare('SELECT COUNT(*) AS n FROM topics').get().n;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (Math.max(1, Math.min(page, pages)) - 1) * pageSize;
  const rows = db.prepare(`
    SELECT t.*, u.username AS author_name, c.name AS category_name,
      (SELECT COUNT(*) FROM replies r WHERE r.topic_id = t.id) AS replies
    FROM topics t
    JOIN users u ON u.id = t.user_id
    JOIN categories c ON c.id = t.category_id
    ORDER BY t.last_reply_at DESC
    LIMIT ? OFFSET ?
  `).all(pageSize, start);
  return {
    topics: rows.map((t) => ({
      id: t.id,
      title: t.title,
      author: t.author_name,
      category: t.category_name,
      replies: t.replies,
      views: t.views,
      pinned: t.pinned === 1,
      closed: t.closed === 1,
      createdAt: t.created_at,
      lastReplyAt: t.last_reply_at,
    })),
    total,
    page: Math.max(1, Math.min(page, pages)),
    pages,
  };
}

function listAllReplies(page = 1) {
  const pageSize = 30;
  const total = db.prepare('SELECT COUNT(*) AS n FROM replies').get().n;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (Math.max(1, Math.min(page, pages)) - 1) * pageSize;
  const rows = db.prepare(`
    SELECT r.*, u.username AS author_name, t.title AS topic_title, c.name AS category_name
    FROM replies r
    JOIN users u ON u.id = r.user_id
    JOIN topics t ON t.id = r.topic_id
    JOIN categories c ON c.id = t.category_id
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).all(pageSize, start);
  return {
    replies: rows.map((r) => ({
      id: r.id,
      content: r.content,
      author: r.author_name,
      topicId: r.topic_id,
      topicTitle: r.topic_title,
      category: r.category_name,
      createdAt: r.created_at,
    })),
    total,
    page: Math.max(1, Math.min(page, pages)),
    pages,
  };
}

function countTopics() {
  return db.prepare('SELECT COUNT(*) AS n FROM topics').get().n;
}

function countReplies() {
  return db.prepare('SELECT COUNT(*) AS n FROM replies').get().n;
}

init();

module.exports = {
  register,
  login,
  auth,
  logout,
  listCategories,
  listTopics,
  getTopic,
  createTopic,
  createReply,
  validatePost,
  rateCheck,
  sanitize,
  modAction,
  deleteTopic,
  deleteReply,
  listAllTopics,
  listAllReplies,
  countTopics,
  countReplies,
  spamScore,
  publicUser,
};
