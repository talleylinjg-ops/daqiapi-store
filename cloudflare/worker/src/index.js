/**
 * DaqiAPI shop worker (shop.daqi.asia).
 *
 * Handles the only dynamic endpoints a storefront needs:
 *   POST /api/checkout      -> create an order (demo fulfillment or Stripe)
 *   GET  /api/order/:id     -> look up an order
 *   POST /api/webhook       -> Stripe checkout.session.completed
 *   GET  /api/health        -> liveness probe
 *
 * Packages/catalog/blog live as static JSON served by Cloudflare Pages, so
 * this worker stays tiny and only touches D1.
 */

const DEMO_MODE = true;
const STRIPE_SECRET_KEY = '';
const STRIPE_WEBHOOK_SECRET = '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,stripe-signature',
  'Access-Control-Max-Age': '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function makeId() {
  return 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

async function getPackage(catalog, id) {
  const res = await fetch(catalog + '/packages.json');
  const data = await res.json();
  // Data is { packages: [...] } — flat list with per-package category field.
  const list = data.packages || [];
  return list.find((p) => p.id === id) || null;
}

function fulfillmentCode(pkg) {
  // Deterministic pseudo-code for demo mode, mirroring the storefront.
  if (pkg.category === 'esim') return `ESIM-${pkg.planKey || pkg.id}-${Date.now().toString(36).toUpperCase()}`;
  if (pkg.category === 'vpn') return `VPN-${pkg.id}-${Date.now().toString(36).toUpperCase()}`;
  return 'ONEAPI-' + Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 6).toUpperCase();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const catalog = env.CATALOG_BASE || 'https://daqi.asia/api';

    // GET /api/health
    if (request.method === 'GET' && pathname === '/api/health') {
      return json({ ok: true });
    }

    // POST /api/checkout
    if (request.method === 'POST' && pathname === '/api/checkout') {
      let body = {};
      try { body = await request.json(); } catch (e) { /* ignore */ }
      const pkg = await getPackage(catalog, body.packageId);
      if (!pkg) return json({ error: 'Invalid package id' }, 400);

      const orderId = makeId();
      const now = Date.now();
      const order = {
        id: orderId,
        package_id: pkg.id,
        package_name: pkg.name,
        amount_usd: pkg.priceUsd,
        email: (body.email || '').trim(),
        product: pkg.product || 'api',
        category: pkg.category,
        plan_key: pkg.planKey || null,
        status: 'pending',
        created_at: now,
      };

      if (DEMO_MODE) {
        const code = fulfillmentCode(pkg);
        order.status = 'fulfilled';
        order.code = code;
        order.updated_at = now;
        await env.DB.prepare(
          'INSERT INTO orders (id, package_id, package_name, amount_usd, email, product, category, plan_key, status, code, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
        )
          .bind(order.id, order.package_id, order.package_name, order.amount_usd, order.email, order.product, order.category, order.plan_key, order.status, order.code, order.created_at, order.updated_at)
          .run();
        return json({
          mode: 'demo',
          orderId: order.id,
          url: `/order/${order.id}`,
          code,
        });
      }

      // Stripe mode (requires keys configured in production).
      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + STRIPE_SECRET_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'mode': 'payment',
          'customer_email': order.email,
          'line_items[0][quantity]': '1',
          'line_items[0][price_data][currency]': 'usd',
          'line_items[0][price_data][unit_amount]': String(Math.round(pkg.priceUsd * 100)),
          'line_items[0][price_data][product_data][name]': pkg.category === 'token' ? `${pkg.name} API Credits` : pkg.name,
          'success_url': `${url.origin}/order/${order.id}?paid=1`,
          'cancel_url': `${url.origin}/?cancel=1#pricing`,
          'metadata[orderId]': order.id,
        }),
      });
      const session = await stripeRes.json();
      order.stripe_session = session.id;
      order.updated_at = now;
      await env.DB.prepare(
        'INSERT INTO orders (id, package_id, package_name, amount_usd, email, product, category, plan_key, status, stripe_session, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
      )
        .bind(order.id, order.package_id, order.package_name, order.amount_usd, order.email, order.product, order.category, order.plan_key, order.status, order.stripe_session, order.created_at, order.updated_at)
        .run();
      return json({ mode: 'stripe', url: session.url }, 200);
    }

    // GET /api/order/:id
    const orderMatch = pathname.match(/^\/api\/order\/([^/]+)$/);
    if (request.method === 'GET' && orderMatch) {
      const row = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderMatch[1]).first();
      if (!row) return json({ error: 'Order not found' }, 404);
      return json({
        id: row.id,
        packageId: row.package_id,
        packageName: row.package_name,
        amountUsd: row.amount_usd,
        email: row.email,
        product: row.product,
        category: row.category,
        status: row.status,
        code: row.code || null,
        createdAt: row.created_at,
      });
    }

    // POST /api/webhook (Stripe)
    if (request.method === 'POST' && pathname === '/api/webhook') {
      const payload = await request.text();
      const signature = request.headers.get('stripe-signature') || '';
      if (!STRIPE_WEBHOOK_SECRET) return json({ error: 'Webhook not configured' }, 501);
      const event = await verifyStripeWebhook(payload, signature, STRIPE_WEBHOOK_SECRET);
      if (event && event.type === 'checkout.session.completed') {
        const orderId = event.data.object.metadata && event.data.object.metadata.orderId;
        if (orderId) {
          await env.DB.prepare("UPDATE orders SET status = 'fulfilled', updated_at = ? WHERE id = ?")
            .bind(Date.now(), orderId).run();
        }
      }
      return json({ received: true });
    }

    return json({ error: 'Not found' }, 404);
  },
};

async function verifyStripeWebhook(payload, signature, secret) {
  // HMAC verification would live here in production.
  return JSON.parse(payload);
}
