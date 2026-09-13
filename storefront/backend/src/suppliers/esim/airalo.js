// Real upstream provider: Airalo eSIM Partner API.
// Enabled when ESIM_PROVIDER contains "airalo".
//
// Env:
//   ESIM_AIRALO_CLIENT_ID / ESIM_AIRALO_CLIENT_SECRET
//   ESIM_AIRALO_BASE_URL (default https://partner.airalo.com)
//   Plan -> Airalo SKU mapping: ESIM_AIRALO_PLAN_<PLANKEY>=<package_id|sku>
//     e.g. ESIM_AIRALO_PLAN_GLOBAL_10GB=995
//
// NOTE: the exact listing endpoint (/packages or /iplans) varies by Airalo API
// version. Adjust `getPrices()` to the upstream spec when integrating.

const config = require('../../config');

const name = 'airalo';
const BASE = (config.esimAiraloBaseUrl || 'https://partner.airalo.com').replace(/\/$/, '');

async function getToken() {
  const res = await fetch(`${BASE}/api/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.esimAiraloClientId,
      client_secret: config.esimAiraloClientSecret,
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) throw new Error(`Airalo token failed: ${res.status}`);
  const data = await res.json();
  return data.data.access_token;
}

function planKeyFor(sku) {
  const prefix = 'ESIM_AIRALO_PLAN_';
  for (const k of Object.keys(process.env)) {
    if (k.startsWith(prefix) && process.env[k] === String(sku)) {
      return k.slice(prefix.length).toLowerCase();
    }
  }
  return null;
}

async function getPrices() {
  if (!config.esimAiraloClientId || !config.esimAiraloClientSecret) {
    throw new Error('ESIM_AIRALO_CLIENT_ID / ESIM_AIRALO_CLIENT_SECRET not configured');
  }
  const token = await getToken();
  const res = await fetch(`${BASE}/api/v2/packages?limit=100`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Airalo packages failed: ${res.status}`);
  const data = await res.json();
  const list = (data.data && data.data.packages) || [];
  const out = [];
  for (const p of list) {
    const planKey = planKeyFor(p.id) || planKeyFor(p.sku);
    if (planKey) {
      out.push({
        provider: name,
        providerLabel: 'Airalo',
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
  if (!config.esimAiraloClientId || !config.esimAiraloClientSecret) {
    throw new Error('ESIM_AIRALO_CLIENT_ID / ESIM_AIRALO_CLIENT_SECRET not configured');
  }
  const token = await getToken();
  const res = await fetch(`${BASE}/api/v2/orders`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      package_id: sku,
      quantity: 1,
      type: 'sim',
      description: `DaqiAPI order ${order.id}`,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airalo order failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const sim = (data.data && data.data.sims && data.data.sims[0]) || {};
  return {
    code: sim.iccid || `ESIM-${order.id.slice(0, 12)}`,
    details: {
      iccid: sim.iccid || null,
      activationCode: sim.lpa || sim.activation_code || null,
      qr: sim.qr_code_url || null,
      eid: sim.eid || null,
    },
    instructions: [
      'Scan the QR code or enter the LPA code delivered by the provider',
      'Add the eSIM profile on your device',
      'Your plan activates when the device connects in a covered country',
    ],
  };
}

module.exports = { name, getPrices, createOrder };
