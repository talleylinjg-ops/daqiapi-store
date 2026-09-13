const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');

const dataDir = path.join(__dirname, '..', 'data');
const commentsFile = path.join(dataDir, 'comments.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(commentsFile, 'utf8'));
  } catch (err) {
    return [];
  }
}

function save(comments) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(commentsFile, JSON.stringify(comments, null, 2));
}

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
  if (urlMatches > 2) score += 2;
  if (words.length > 60) score += 1;
  if (upper / letters > 0.6) score += 2;
  if (/[!]{3,}|\*{2,}/.test(text)) score += 1;
  return score;
}

function listByPost(postSlug, { page = 1, sort = 'newest' } = {}) {
  const all = load();
  const approved = all
    .filter((c) => c.postSlug === postSlug && c.status === 'approved')
    .sort((a, b) => (sort === 'oldest' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt));
  const pageSize = 10;
  const total = approved.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (Math.max(1, Math.min(page, pages)) - 1) * pageSize;
  return {
    comments: approved.slice(start, start + pageSize).map((c) => ({
      id: c.id,
      author: c.author,
      content: c.content,
      reply: c.reply || null,
      createdAt: c.createdAt,
    })),
    total,
    page: Math.max(1, Math.min(page, pages)),
    pages,
  };
}

function listPending() {
  return load().filter((c) => c.status === 'pending');
}

function listAll(page = 1) {
  const all = load().sort((a, b) => b.createdAt - a.createdAt);
  const pageSize = 20;
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (Math.max(1, Math.min(page, pages)) - 1) * pageSize;
  return {
    comments: all.slice(start, start + pageSize),
    total,
    page: Math.max(1, Math.min(page, pages)),
    pages,
  };
}

const rateLimit = new Map();

function create({ postSlug, author, email, content, ip = '' }) {
  const authorClean = sanitize(author);
  const emailClean = sanitize(email || '');
  const contentClean = sanitize(content);

  if (authorClean.length < 2 || authorClean.length > 60) return { error: 'AUTHOR_LENGTH' };
  if (contentClean.length < 2 || contentClean.length > 1000) return { error: 'CONTENT_LENGTH' };
  if (emailClean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) return { error: 'EMAIL_INVALID' };
  if (/https?:\/\/|www\./i.test(authorClean)) return { error: 'SPAM' };
  if (spamScore(contentClean) >= 3) return { error: 'SPAM' };

  const now = Date.now();
  const rl = rateLimit.get(ip) || [];
  const recent = rl.filter((t) => now - t < 3600000);
  if (recent.length >= 5) return { error: 'RATE_LIMIT' };
  if (recent.length && now - recent[recent.length - 1] < 30000) return { error: 'RATE_LIMIT' };

  const all = load();
  const dup = all.find(
    (c) =>
      c.author === authorClean &&
      c.content === contentClean &&
      now - c.createdAt < 3600000
  );
  if (dup) return { error: 'DUPLICATE' };

  rateLimit.set(ip, [...recent, now]);
  const comment = {
    id: nanoid(10),
    postSlug,
    author: authorClean,
    email: emailClean,
    content: contentClean,
    status: 'pending',
    reply: null,
    createdAt: now,
  };
  all.push(comment);
  save(all);
  return { comment };
}

function setStatus(id, status) {
  const all = load();
  const c = all.find((x) => x.id === id);
  if (!c) return null;
  c.status = status;
  save(all);
  return c;
}

function remove(id) {
  const all = load();
  const idx = all.findIndex((x) => x.id === id);
  if (idx === -1) return null;
  const [removed] = all.splice(idx, 1);
  save(all);
  return removed;
}

function setReply(id, replyContent) {
  const all = load();
  const c = all.find((x) => x.id === id);
  if (!c) return null;
  c.reply = sanitize(replyContent).slice(0, 1000);
  save(all);
  return c;
}

module.exports = { listByPost, listPending, listAll, create, setStatus, remove, setReply };
