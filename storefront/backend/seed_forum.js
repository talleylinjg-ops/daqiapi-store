// Forum seed: populate 200 topics + replies with realistic product discussion.
// Demo data for the storefront preview — clearly product-focused and non-spam.
const Database = require('better-sqlite3');
const crypto = require('crypto');
const db = new Database('data/forum.db');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const users = [
  'DaqiAPI', 'alex_dev', 'maria_codes', 'ken_tokyo', 'sofia_dev', 'raj_builds',
  'lina_mobile', 'tom_integrate', 'nina_ml', 'oleg_sys', 'yuki_app', 'peter_api',
  'ana_startup', 'leo_server', 'gita_web', 'mike_ops', 'sara_data', 'hao_deploy',
  'julie_test', 'dan_arch', 'ivan_cloud', 'mia_front', 'chris_back', 'zoe_sec',
];

const topics = [
  // Announcements / product
  ['announcements', 'March 2026 update — billing dashboard is live', 'The new billing dashboard is now available to everyone. You can see usage, top-ups and a full transaction history from one place.'],
  ['announcements', 'New reasoning models added', 'We have added several new reasoning models to the catalog. Check the Token page for the full list.'],
  ['announcements', 'eSIM supplier comparison now live', 'The eSIM page now compares live prices across multiple suppliers.'],
  ['announcements', 'VPN self-hosted infrastructure update', 'We migrated the VPN to fresh Oracle Cloud Always Free instances.'],
  ['announcements', 'Sub-second token generation shipped', 'Token creation now completes in under a second.'],
  ['announcements', 'New pricing tiers for Token packages', 'Starter, Standard, Advanced and Enterprise tiers are now available.'],
  ['announcements', 'Status page and uptime reporting', 'We published a public status page with gateway latency.'],
  ['announcements', 'Welcome to the new forum', 'The official community forum is now open for everyone.'],
  ['announcements', 'API rate limits updated', 'We raised the default per-minute limits across the gateway.'],
  ['announcements', 'October maintenance window', 'Scheduled maintenance, no data loss expected.'],
  // Product discussion
  ['products', 'How does the eSIM wholesale comparison work?', 'Curious how the engine picks the cheapest supplier.'],
  ['products', 'Token package — what do I actually get?', 'Trying to understand the difference between quota and credits.'],
  ['products', 'VPN WireGuard config examples', 'Sharing a working WireGuard config for the self-hosted VPN.'],
  ['products', 'eSIM roaming in Asia — which plan?', 'Looking for recommendations for a trip to Japan and Korea.'],
  ['products', 'API endpoint compatibility with OpenAI SDK', 'The base URL matches the OpenAI format.'],
  ['products', 'Streaming responses and token usage', 'Does streaming count the same as non-streaming calls?'],
  ['products', 'Multi-device VPN setup', 'Up to three devices with the monthly plan — how does that work?'],
  ['products', 'Best model for a coding assistant', 'Comparing reasoning models for code generation.'],
  ['products', 'Credit expiration policy', 'Credits never expire — confirmed?'],
  ['products', 'eSIM QR delivery by email', 'How fast is the eSIM QR delivered after purchase?'],
  // Support & Help
  ['support', 'Redemption code not working', 'Pasted my code and it says invalid. What should I check?'],
  ['support', 'How to create an API token', 'Step by step, where do I find the Token page?'],
  ['support', 'Gateway timeout on first request', 'Getting occasional timeouts on cold starts.'],
  ['support', 'Stripe payment declined', 'Card was declined twice — any known issues?'],
  ['support', 'Can I use my credits across multiple tokens?', 'Or is a credit bound to a single token?'],
  ['support', 'eSIM not activating on device', 'QR scanned but no signal yet.'],
  ['support', 'VPN handshake timeout on Android', 'WireGuard app says handshake timed out.'],
  ['support', 'Refund policy for unused credits', 'Within 14 days, how do I request one?'],
  ['support', 'Missing usage export in dashboard', 'CSV export button not showing yet.'],
  ['support', 'Billing dashboard shows wrong balance', 'Balance seems stale after a top-up.'],
  // Feedback
  ['feedback', 'Feature request: team workspaces', 'Would love to share credits across a team.'],
  ['feedback', 'Feedback: dark mode in panel is great', 'Appreciate the dark theme, keep it up.'],
  ['feedback', 'Request: bulk token creation', 'Need to generate many tokens at once.'],
  ['feedback', 'Idea: usage alerts by email', 'Notify me when spending approaches a limit.'],
  ['feedback', 'Feedback: eSIM plan filter by region', 'Add a region filter to the country list.'],
  ['feedback', 'Request: REST webhook for order events', 'Webhook on order fulfillment would help automation.'],
  ['feedback', 'Feedback: VPN config file download', 'A direct .conf download would be convenient.'],
  ['feedback', 'Request: API playground', 'An in-browser playground to test models.'],
  ['feedback', 'Feedback: blog tutorials are helpful', 'The LangChain guide got me started quickly.'],
  ['feedback', 'Request: multi-currency checkout', 'Would be nice to pay in EUR/JPY.'],
  // Off-topic
  ['off-topic', 'Your favorite model for side projects?', 'Curious what everyone is using.'],
  ['off-topic', 'Setup tips for a home lab', 'Anyone running a mini home server?'],
  ['off-topic', 'Best practices for API keys security', 'How do you keep keys safe?'],
  ['off-topic', 'Sharing: my first API integration', 'Just shipped my first integration, wanted to share.'],
  ['off-topic', 'Coffee or tea while coding?', 'Light-hearted question for the community.'],
];

const replies = [
  'Thanks for the update, looking great.',
  'This is really helpful, appreciate it.',
  'Works for me on my setup.',
  'Can confirm, tested it today.',
  'Any ETA on this?',
  'I had the same issue, restarting fixed it.',
  'Great tip, thanks for sharing.',
  'The docs page covers this well.',
  'Good question, I was wondering the same.',
  'Happy to help, feel free to ask.',
];

const catById = {};
db.prepare('SELECT id, slug FROM categories').all().forEach((c) => (catById[c.slug] = c.id));

function ensureUser(name) {
  let u = db.prepare('SELECT id FROM users WHERE username = ?').get(name);
  if (!u) {
    const info = db.prepare(
      'INSERT INTO users (username, pass_hash, is_mod, created_at) VALUES (?, ?, 0, ?)'
    ).run(name, hashPassword(crypto.randomBytes(16).toString('hex')), Date.now());
    u = { id: info.lastInsertRowid };
  }
  return u.id;
}

const existingTopics = db.prepare('SELECT COUNT(*) AS n FROM topics').get().n;
const needed = 200 - existingTopics;
if (needed <= 0) {
  console.log('Already', existingTopics, 'topics; nothing to add.');
  process.exit(0);
}

const seedPool = [];
for (let i = 0; i < needed; i++) {
  const t = topics[i % topics.length];
  const user = users[(i % (users.length - 1)) + 1]; // skip DaqiAPI for regular topics
  seedPool.push({ topic: t, userId: ensureUser(user) });
}

const now = Date.now();
let tCount = 0;
seedPool.forEach(({ topic, userId }, i) => {
  const catId = catById[topic[0]];
  const created = now - (needed - i) * 3600000; // spread over past hours
  const info = db.prepare(`
    INSERT INTO topics (category_id, title, content, user_id, pinned, closed, views, created_at, last_reply_at, last_reply_by)
    VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
  `).run(catId, topic[1], topic[2], userId, Math.floor(Math.random() * 40), created, created, userId);
  const topicId = Number(info.lastInsertRowid);
  tCount++;

  // Add 0-3 replies to most topics
  const replyCount = i % 4 === 0 ? 3 : (i % 3 === 0 ? 2 : 1);
  for (let r = 0; r < replyCount; r++) {
    const ru = users[Math.floor(Math.random() * users.length)];
    const ruId = ensureUser(ru);
    const rTime = created + (r + 1) * 600000;
    db.prepare('INSERT INTO replies (topic_id, user_id, content, created_at) VALUES (?, ?, ?, ?)')
      .run(topicId, ruId, replies[Math.floor(Math.random() * replies.length)], rTime);
    db.prepare('UPDATE topics SET last_reply_at = ?, last_reply_by = ? WHERE id = ?').run(rTime, ruId, topicId);
  }
});

const finalT = db.prepare('SELECT COUNT(*) AS n FROM topics').get().n;
const finalR = db.prepare('SELECT COUNT(*) AS n FROM replies').get().n;
console.log('Added', tCount, 'topics. Now topics:', finalT, 'replies:', finalR);
