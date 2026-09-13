// Real upstream provider template: eSIMGo Partner API.
// Enabled when ESIM_PROVIDER contains "esimgo".
//
// Env:
//   ESIMGO_API_KEY
//   ESIMGO_API_URL (default https://partner.esimgo.com)
//   Plan -> eSIMGo SKU mapping: ESIM_ESIMGO_PLAN_<PLANKEY>=<sku>
//
// NOTE: adjust endpoints/fields below to the actual eSIMGo API spec.

const config = require('../../config');

const name = 'esimgo';
const BASE = (config.esimgoApiUrl || 'https://partner.esimgo.com').replace(/\/$/, '');

function headers() {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.esimgoApiKey}`,
  };
}

function planKeyFor(sku) {
  const prefix = 'ESIM_ESIMGO_PLAN_';
  for (const k of Object.keys(process.env)) {
    if (k.startsWith(prefix) && process.env[k] === String(sku)) {
      return k.slice(prefix.length).toLowerCase();
    }
  }
  return null;
}

async function getPrices() {
  if (!config.esimgoApiKey) throw new Error('ESIMGO_API_KEY not configured');
  const res = await fetch(`${BASE}/v1/packages`, { headers: headers() });
  if (!res.ok) throw new Error(`eSIMGo packages failed: ${res.status}`);
  const data = await res.json();
  const list = (data && data.packages) || (data && data.data) || [];
  const out = [];
  for (const p of list) {
    const planKey = planKeyFor(p.id) || planKeyFor(p.sku);
    if (planKey) {
      out.push({
        provider: name,
        providerLabel: 'eSIMGo',
        sku: p.id,
        planKey,
        wholesale: parseFloat(p.price),
        demo: false,
      });
    }
  }
  return out;
}

async function createOrder({ planKey, sku, order }) {
  if (!config.esimgoApiKey) throw new Error('ESIMGO_API_KEY not configured');
  const res = await fetch(`${BASE}/v1/orders`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ package_id: sku, quantity: 1, note: `DaqiAPI order ${order.id}` }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`eSIMGo order failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    code: (data && (data.iccid || data.order_id)) || `ESIM-${order.id.slice(0, 12)}`,
    details: {
      iccid: (data && data.iccid) || null,
      activationCode: (data && (data.lpa || data.activation_code)) || null,
      qr: (data && data.qr_code_url) || null,
    },
    instructions: [
      'Scan the QR code or enter the LPA code delivered by the provider',
      'Add the eSIM profile on your device',
      'Your plan activates when the device connects in a covered country',
    ],
  };
}

module.exports = { name, getPrices, createOrder };
