// Real upstream provider: Airalo eSIM Partner API.
// Enabled when ESIM_PROVIDER=airalo and credentials are present in .env:
//   ESIM_AIRALO_CLIENT_ID, ESIM_AIRALO_CLIENT_SECRET
//   ESIM_AIRALO_BASE_URL (default https://partner.airalo.com)
//   ESIM_AIRALO_SANDBOX=true  -> uses the sandbox API
//
// Flow: 1) token  -> 2) create order (by product id) -> 3) return SIM activation info.
// Package -> Airalo mapping: set ESIM_AIRALO_PACKAGE_<packageId>=<airalo packageId|sku>.

const config = require('../config');

const BASE = (config.esimAiraloBaseUrl || 'https://partner.airalo.com').replace(/\/$/, '');

function headers(token) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

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

async function createOrder(token, pkg, order) {
  const key = `ESIM_AIRALO_PACKAGE_${pkg.id.toUpperCase().replace(/-/g, '_')}`;
  const airaloPackage = process.env[key] || pkg.airaloPackageId;
  if (!airaloPackage) {
    throw new Error(`Airalo package not mapped. Set ${key} in .env`);
  }
  const res = await fetch(`${BASE}/api/v2/orders`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      package_id: airaloPackage,
      quantity: 1,
      type: 'sim',
      description: `DaqiAPI order ${order.id}`,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airalo order failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function activate(pkg, order) {
  if (!config.esimAiraloClientId || !config.esimAiraloClientSecret) {
    throw new Error('ESIM_AIRALO_CLIENT_ID / ESIM_AIRALO_CLIENT_SECRET not configured');
  }
  const token = await getToken();
  const data = await createOrder(token, pkg, order);
  const sim = (data.data && data.data.sims && data.data.sims[0]) || {};
  return {
    provider: 'airalo',
    code: sim.iccid || `ESIM-${order.id.slice(0, 12)}`,
    details: {
      iccid: sim.iccid || null,
      lpa: sim.lpa || sim.activation_code || null,
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

module.exports = { name: 'airalo', activate };
