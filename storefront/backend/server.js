const express = require('express');
const cors = require('cors');
const config = require('./src/config');
const { packages, getByCategory, getPackage, quotaFor } = require('./src/packages');
const { categories, getCategory } = require('./src/categories');
const catalog = require('./src/catalog');
const esimCatalog = require('./src/esimCatalog');
const { listCountries, REGION_LABELS } = require('./src/countries');
const { createRedemption, listModels, listTokens, listChannels, listUsers } = require('./src/oneapi');
const { createOrder, getOrder, listOrders, updateOrder } = require('./src/orders');
const suppliers = require('./src/suppliers');
const { getPosts, getPost, getCategories } = require('./src/blog');
const comments = require('./src/comments');
const { templates } = require('./src/replyTemplates');
const forum = require('./src/forum');
const admin = require('./src/admin');

const app = express();
app.use(cors());
app.use('/static', express.static('public'));

let stripe = null;
if (!config.demoMode) {
  stripe = require('stripe')(config.stripeSecretKey);
}

function baseUrl(req) {
  return config.baseUrl || `${req.protocol}://${req.get('host')}`;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, demoMode: config.demoMode });
});

app.get('/api/categories', async (req, res) => {
  try {
    const cat = await catalog.getCatalog();
    res.json({
      categories: categories.map((c) => ({
        ...c,
        packages: cat[c.id] || [],
      })),
    });
  } catch (err) {
    console.error('[categories]', err.message);
    res.status(500).json({ error: 'Failed to load catalog' });
  }
});

app.get('/api/categories/:id', async (req, res) => {
  const cat = getCategory(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  try {
    const full = await catalog.getCatalog();
    res.json({ ...cat, packages: full[cat.id] || [] });
  } catch (err) {
    console.error('[category]', err.message);
    res.status(500).json({ error: 'Failed to load category' });
  }
});

app.get('/api/esim/compare', async (req, res) => {
  try {
    const rows = await esimCatalog.compare();
    res.json({ margin: config.esimMargin, providers: suppliers.esim.configuredProviders().map((p) => p.name), plans: rows });
  } catch (err) {
    console.error('[esim/compare]', err.message);
    res.status(500).json({ error: 'Failed to compare eSIM prices' });
  }
});

app.get('/api/esim/countries', (req, res) => {
  res.json({ regionLabels: REGION_LABELS, countries: listCountries() });
});

app.get('/api/models', (req, res) => {
  try {
    res.json({ models: listModels() });
  } catch (err) {
    console.error('[models]', err.message);
    res.status(500).json({ error: 'Failed to load models' });
  }
});

app.get('/api/vpn/status', (req, res) => {  const provider = (config.vpnProvider || '').toLowerCase();
  res.json({
    selfHosted: true,
    provider,
    mode: provider === 'oracle' ? 'oracle' : 'demo',
    region: provider === 'oracle' ? 'Oracle Cloud Always Free (US)' : 'US East (Ashburn)',
    infra: 'Oracle Cloud Always Free',
    monthlyServerCostUsd: 0,
    protocol: 'WireGuard',
    oracleConfigured: !!(config.vpnOracleHost && config.vpnOracleUser),
  });
});

app.get('/api/packages', async (req, res) => {
  const category = req.query.category;
  let list;
  try {
    const full = await catalog.getCatalog();
    if (category && getCategory(category)) {
      list = full[category] || [];
    } else {
      list = [].concat(full.token, full.esim, full.vpn);
    }
    res.json({
      demoMode: config.demoMode,
      quotaPerUnit: config.quotaPerUnit,
      packages: list,
    });
  } catch (err) {
    console.error('[packages]', err.message);
    res.status(500).json({ error: 'Failed to load packages' });
  }
});

app.use(express.json());

async function fulfillOrder(order) {
  let result;
  if (order.category === 'token') {
    const pkg = getPackage(order.packageId);
    const redemption = createRedemption({ name: pkg ? pkg.name : order.packageName, quota: pkg ? quotaFor(pkg) : 0 });
    result = { key: redemption.key, provider: 'oneapi' };
  } else if (order.category === 'esim') {
    result = await esimCatalog.fulfillEsim(order.planKey, order);
  } else if (order.category === 'vpn') {
    result = await suppliers.vpn.fulfill(null, order);
  } else {
    return null;
  }
  updateOrder(order.id, { status: 'paid', code: result.code || result.key || null, fulfillment: result });
  return result;
}

app.post('/api/checkout', async (req, res) => {
  const { packageId, email } = req.body || {};
  const pkg = await catalog.getPackage(packageId);
  if (!pkg) {
    return res.status(400).json({ error: 'Invalid package id' });
  }

  const order = createOrder({
    packageId: pkg.id,
    packageName: pkg.name,
    amountUsd: pkg.priceUsd,
    email: (email || '').trim(),
    product: pkg.product || 'api',
    category: pkg.category,
    planKey: pkg.planKey || null,
  });

  if (config.demoMode) {
    const fulfillment = await fulfillOrder(order);
    return res.json({
      mode: 'demo',
      orderId: order.id,
      url: `/order/${order.id}`,
      code: fulfillment.code || fulfillment.key,
      fulfillment,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: order.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: pkg.priceUsd * 100,
            product_data: {
              name: pkg.category === 'token' ? `${pkg.name} API Credits` : pkg.name,
              description:
                pkg.category === 'token'
                  ? `${pkg.quotaUsd} USD of API usage credits`
                  : pkg.note || pkg.name,
            },
          },
        },
      ],
      success_url: `${baseUrl(req)}/order/${order.id}?paid=1`,
      cancel_url: `${baseUrl(req)}/?cancel=1#pricing`,
      metadata: { orderId: order.id },
    });
    updateOrder(order.id, { stripeSessionId: session.id });
    return res.json({ mode: 'stripe', url: session.url });
  } catch (err) {
    console.error('[checkout] Stripe error:', err.message);
    return res.status(500).json({ error: 'Payment setup failed' });
  }
});

app.get('/api/order/:id', (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  return res.json(order);
});

app.post(
  '/api/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe) {
      return res.status(400).json({ error: 'Stripe is not enabled' });
    }
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], config.stripeWebhookSecret);
    } catch (err) {
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata && session.metadata.orderId;
      if (orderId) {
        const order = getOrder(orderId);
        if (order && order.status === 'pending') {
          try {
            await fulfillOrder(order);
          } catch (err) {
            console.error('[webhook] fulfillment failed:', err.message);
            updateOrder(order.id, { status: 'failed', fulfillmentError: err.message });
          }
        }
      }
    }
    return res.json({ received: true });
  }
);

// --- Blog ---

app.get('/api/blog/categories', (req, res) => {
  res.json({ categories: getCategories() });
});

app.get('/api/blog/posts', (req, res) => {
  const category = req.query.category;
  let list = getPosts();
  if (category) {
    list = list.filter((p) => p.category === category);
  }
  res.json({ posts: list });
});

app.get('/api/blog/posts/:slug', (req, res) => {
  const post = getPost(req.params.slug);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

app.get('/api/blog/posts/:slug/comments', (req, res) => {
  const post = getPost(req.params.slug);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const page = parseInt(req.query.page || '1', 10) || 1;
  const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest';
  res.json(comments.listByPost(post.slug, { page, sort }));
});

app.post('/api/blog/posts/:slug/comments', (req, res) => {
  const post = getPost(req.params.slug);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const { author, email, content } = req.body || {};
  const ip = req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.socket.remoteAddress || '';
  const result = comments.create({ postSlug: post.slug, author, email, content, ip });
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  return res.json({ ok: true, id: result.comment.id, status: result.comment.status });
});

app.get('/api/blog/reply-templates', (req, res) => {
  res.json({ templates });
});

function requireAdmin(req, res) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== config.adminToken) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return false;
  }
  return true;
}

app.get('/api/blog/admin/comments', (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({ pending: comments.listPending() });
});

app.post('/api/blog/admin/comments/:id/approve', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const c = comments.setStatus(req.params.id, 'approved');
  if (!c) return res.status(404).json({ error: 'Comment not found' });
  res.json({ ok: true });
});

app.post('/api/blog/admin/comments/:id/delete', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const c = comments.remove(req.params.id);
  if (!c) return res.status(404).json({ error: 'Comment not found' });
  res.json({ ok: true });
});

app.post('/api/blog/admin/comments/:id/reply', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { content } = req.body || {};
  if (!content || content.trim().length < 2) return res.status(400).json({ error: 'CONTENT_LENGTH' });
  const c = comments.setReply(req.params.id, content);
  if (!c) return res.status(404).json({ error: 'Comment not found' });
  res.json({ ok: true });
});

app.get('/robots.txt', (req, res) => {
  const base = baseUrl(req);
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /admin/',
      'Disallow: /api/',
      '',
      'User-agent: GPTBot',
      'Allow: /',
      '',
      'User-agent: OAI-SearchBot',
      'Allow: /',
      '',
      'User-agent: ChatGPT-User',
      'Allow: /',
      '',
      'User-agent: ClaudeBot',
      'Allow: /',
      '',
      'User-agent: PerplexityBot',
      'Allow: /',
      '',
      'User-agent: Google-Extended',
      'Allow: /',
      '',
      `# AI/LLM documentation: ${base}/llms.txt`,
      `Sitemap: ${base}/sitemap.xml`,
      '',
    ].join('\n')
  );
});

app.get('/llms.txt', (req, res) => {
  const base = baseUrl(req);
  const lines = [
    '# DaqiAPI',
    '',
    '> DaqiAPI is an OpenAI-compatible API gateway and storefront. Buy credits,',
    '> redeem a code, create an API token, and call chat, reasoning and embedding',
    '> models through a single OpenAI-compatible endpoint. The site also offers',
    '> eSIM data plans and VPN access.',
    '',
    'Key facts:',
    `- API base URL: ${base}/v1 (OpenAI-compatible)`,
    '- Auth: Bearer token created in the account panel',
    '- Models: fast/mini, reasoning, and embedding model classes',
    '- Billing: prepaid credits, redeemed via redemption codes',
    `- Docs and guides: ${base}/blog`,
    `- Community forum: ${base}/forum`,
    '',
    '## Main pages',
    `- [Home](${base}/): product overview, pricing and credit purchase`,
    `- [Blog](${base}/blog): integration guides, model selection and cost tips`,
    `- [Forum](${base}/forum): community discussions and announcements`,
    `- [Token](${base}/token): API token setup`,
    `- [eSIM](${base}/esim): eSIM data plans`,
    `- [VPN](${base}/vpn): VPN access`,
    '',
    '## Guides',
  ];
  for (const p of getPosts()) {
    lines.push(`- [${p.title}](${base}/blog/${p.slug}): ${(p.excerpt || '').replace(/\n/g, ' ').trim()}`);
  }
  try {
    lines.push('', '## Forum categories');
    for (const c of forum.listCategories()) {
      lines.push(`- [${c.name}](${base}/forum/category/${c.id}): ${(c.description || '').replace(/\n/g, ' ').trim()}`);
    }
  } catch (err) {
    console.warn('[storefront-backend] llms.txt forum section failed:', err.message);
  }
  lines.push('');
  res.type('text/plain').send(lines.join('\n'));
});

async function requireAdminUser(req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const user = await admin.auth(token);
  if (!user) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return null;
  }
  return user;
}

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  const result = await admin.login(username, password);
  if (result.error) return res.status(401).json({ error: result.error });
  res.json(result);
});

app.post('/api/admin/logout', async (req, res) => {
  const header = req.headers.authorization || '';
  await admin.logout(header.startsWith('Bearer ') ? header.slice(7) : '');
  res.json({ ok: true });
});

app.get('/api/admin/me', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  res.json({ user: { id: u.id, username: u.username, is_super: u.is_super === 1 } });
});

app.get('/api/admin/dashboard', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  const orders = listOrders();
  const revenue = orders
    .filter((o) => o.status === 'paid' || o.status === 'fulfilled')
    .reduce((s, o) => s + (o.amountUsd || 0), 0);
  const cat = await catalog.getCatalog();
  res.json({
    orders: orders.length,
    revenue: Math.round(revenue * 100) / 100,
    pendingComments: comments.listPending().length,
    forumTopics: forum.countTopics(),
    forumReplies: forum.countReplies(),
    products: cat.token.length + cat.esim.length + cat.vpn.length,
    categories: Object.keys(cat).length,
  });
});

app.get('/api/admin/orders', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  res.json({ orders: listOrders() });
});

app.get('/api/admin/orders/:id', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
  res.json({ order });
});

app.post('/api/admin/orders/:id/status', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  const { status } = req.body || {};
  const allowed = ['pending', 'paid', 'fulfilled', 'failed', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'BAD_STATUS' });
  const order = updateOrder(req.params.id, { status });
  if (!order) return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
  res.json({ order });
});

app.get('/api/admin/products', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  const cat = await catalog.getCatalog();
  const overrides = await admin.listOverrides();
  const all = [].concat(cat.token, cat.esim, cat.vpn);
  res.json({
    groups: Object.keys(cat),
    products: all.map((p) => ({
      ...p,
      override: overrides[p.id] || null,
    })),
  });
});

app.post('/api/admin/products/:id', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  const { priceUsd, enabled } = req.body || {};
  const result = await admin.setOverride(req.params.id, { priceUsd, enabled });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ ok: true, override: result });
});

app.delete('/api/admin/products/:id/override', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  await admin.query('DELETE FROM product_overrides WHERE product_id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.get('/api/admin/comments', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  const page = parseInt(req.query.page || '1', 10) || 1;
  const filter = req.query.status === 'pending' ? 'pending' : 'all';
  const data = comments.listAll(page);
  if (filter === 'pending') {
    const pending = comments.listPending().sort((a, b) => b.createdAt - a.createdAt);
    return res.json({ comments: pending, total: pending.length, page: 1, pages: 1 });
  }
  res.json(data);
});

app.post('/api/admin/comments/:id/:action', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  const { id, action } = req.params;
  if (action === 'approve') {
    if (!comments.setStatus(id, 'approved')) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ ok: true });
  }
  if (action === 'delete') {
    if (!comments.remove(id)) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ ok: true });
  }
  if (action === 'reply') {
    const { content } = req.body || {};
    if (!content || content.trim().length < 2) return res.status(400).json({ error: 'CONTENT_LENGTH' });
    if (!comments.setReply(id, content)) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ ok: true });
  }
  res.status(400).json({ error: 'BAD_ACTION' });
});

app.get('/api/admin/forum/topics', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  const page = parseInt(req.query.page || '1', 10) || 1;
  res.json(forum.listAllTopics(page));
});

app.get('/api/admin/forum/replies', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  const page = parseInt(req.query.page || '1', 10) || 1;
  res.json(forum.listAllReplies(page));
});

app.post('/api/admin/forum/topics/:id/:action', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  const id = parseInt(req.params.id, 10);
  const { action } = req.params;
  const patchs = { pin: 'pinned = 1', unpin: 'pinned = 0', close: 'closed = 1', open: 'closed = 0' };
  if (action === 'delete') {
    const d = forum.deleteTopic(id);
    return d ? res.json({ ok: true }) : res.status(404).json({ error: 'NOT_FOUND' });
  }
  const patch = patchs[action];
  if (!patch) return res.status(400).json({ error: 'BAD_ACTION' });
  const m = forum.modAction(id, patch);
  return m ? res.json({ ok: true }) : res.status(404).json({ error: 'NOT_FOUND' });
});

app.post('/api/admin/forum/replies/:id/delete', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  const id = parseInt(req.params.id, 10);
  const d = forum.deleteReply(id);
  return d ? res.json({ ok: true }) : res.status(404).json({ error: 'NOT_FOUND' });
});

app.get('/api/admin/tokens', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  const limit = parseInt(req.query.limit || '100', 10);
  res.json({ tokens: listTokens(Math.max(1, Math.min(limit, 500))) });
});

app.get('/api/admin/channels', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  res.json({ channels: listChannels() });
});

app.get('/api/admin/users', async (req, res) => {
  const u = await requireAdminUser(req, res);
  if (!u) return;
  res.json({ users: listUsers() });
});

function forumUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return forum.auth(token);
}

function forumIp(req) {
  return req.headers['x-forwarded-for']
    ? String(req.headers['x-forwarded-for']).split(',')[0].trim()
    : req.socket.remoteAddress || '';
}

app.post('/api/forum/register', (req, res) => {
  const { username, password } = req.body || {};
  const result = forum.register(username, password);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.post('/api/forum/login', (req, res) => {
  const { username, password } = req.body || {};
  const result = forum.login(username, password);
  if (result.error) return res.status(401).json({ error: result.error });
  res.json(result);
});

app.post('/api/forum/logout', (req, res) => {
  const header = req.headers.authorization || '';
  forum.logout(header.startsWith('Bearer ') ? header.slice(7) : '');
  res.json({ ok: true });
});

app.get('/api/forum/me', (req, res) => {
  const user = forumUser(req);
  if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });
  res.json({ user: forum.publicUser(user) });
});

app.get('/api/forum/categories', (req, res) => {
  res.json({ categories: forum.listCategories() });
});

app.get('/api/forum/categories/:id/topics', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'BAD_ID' });
  const page = parseInt(req.query.page || '1', 10) || 1;
  res.json(forum.listTopics(id, page));
});

app.get('/api/forum/topics/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'BAD_ID' });
  const page = parseInt(req.query.page || '1', 10) || 1;
  const result = forum.getTopic(id, page);
  if (!result) return res.status(404).json({ error: 'TOPIC_NOT_FOUND' });
  res.json(result);
});

app.post('/api/forum/topics', (req, res) => {
  const user = forumUser(req);
  if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const ip = forumIp(req);
  const rl = forum.rateCheck(ip, `topic:${user.id}:${ip}`);
  if (rl.error) return res.status(429).json({ error: rl.error });
  const { categoryId, title, content } = req.body || {};
  const v = forum.validatePost(content, title, ip);
  if (v.error) return res.status(400).json({ error: v.error });
  const created = forum.createTopic(user.id, categoryId, v.title, v.content);
  if (created.error) return res.status(400).json({ error: created.error });
  res.json({ ok: true, id: created.id });
});

app.post('/api/forum/topics/:id/replies', (req, res) => {
  const user = forumUser(req);
  if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const ip = forumIp(req);
  const rl = forum.rateCheck(ip, `reply:${user.id}:${ip}`);
  if (rl.error) return res.status(429).json({ error: rl.error });
  const id = parseInt(req.params.id, 10);
  const v = forum.validatePost((req.body || {}).content);
  if (v.error) return res.status(400).json({ error: v.error });
  const created = forum.createReply(user.id, id, v.content);
  if (created.error) return res.status(400).json({ error: created.error });
  res.json({ ok: true, id: created.id });
});

app.post('/api/forum/admin/topics/:id/:action', (req, res) => {
  const user = forumUser(req);
  if (!user || user.is_mod !== 1) return res.status(403).json({ error: 'FORBIDDEN' });
  const id = parseInt(req.params.id, 10);
  const { action } = req.params;
  const patchs = { pin: 'pinned = 1', unpin: 'pinned = 0', close: 'closed = 1', open: 'closed = 0' };
  if (action === 'delete') {
    const d = forum.deleteTopic(id);
    return d ? res.json({ ok: true, id: d.id }) : res.status(404).json({ error: 'NOT_FOUND' });
  }
  const patch = patchs[action];
  if (!patch) return res.status(400).json({ error: 'BAD_ACTION' });
  const m = forum.modAction(id, patch);
  return m ? res.json({ ok: true, id: m.id }) : res.status(404).json({ error: 'NOT_FOUND' });
});

app.post('/api/forum/admin/replies/:id/delete', (req, res) => {
  const user = forumUser(req);
  if (!user || user.is_mod !== 1) return res.status(403).json({ error: 'FORBIDDEN' });
  const id = parseInt(req.params.id, 10);
  const d = forum.deleteReply(id);
  return d ? res.json({ ok: true, id: d.id }) : res.status(404).json({ error: 'NOT_FOUND' });
});

app.get('/sitemap.xml', (req, res) => {
  const base = baseUrl(req);
  const urls = ['/', '/blog', '/forum', '/token', '/esim', '/vpn'];
  for (const p of getPosts()) urls.push(`/blog/${p.slug}`);
  try {
    for (const c of forum.listCategories()) urls.push(`/forum/category/${c.id}`);
    let page = 1;
    for (;;) {
      const result = forum.listAllTopics(page);
      for (const t of result.topics) urls.push(`/forum/topic/${t.id}`);
      if (page >= result.pages) break;
      page += 1;
    }
  } catch (err) {
    console.warn('[storefront-backend] sitemap forum section failed:', err.message);
  }
  const escape = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url><loc>${escape(base + u)}</loc></url>`),
    '</urlset>',
  ].join('\n');
  res.type('application/xml').send(xml);
});

admin.init().then(() => {
  console.log('[storefront-backend] admin DB ready');
}).catch((err) => {
  console.warn('[storefront-backend] admin DB init failed:', err.message);
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`[storefront-backend] listening on http://0.0.0.0:${config.port}`);
  console.log(`[storefront-backend] payment mode: ${config.demoMode ? 'DEMO (no real payment)' : 'Stripe (test/live)'}`);
});
