// Real upstream provider: generic HTTP VPN reseller API.
// Enabled when VPN_PROVIDER=reseller (or http) and credentials are present in .env:
//   VPN_API_URL   (base url of the reseller API)
//   VPN_API_KEY   (API token)
//
// Expected contract (adjust to the actual upstream spec):
//   POST {VPN_API_URL}/v1/access-keys   body: { plan: <sku>, note: <order id> }
//   -> 200 { id, username, password, config_url }
//
// Package -> upstream SKU mapping: set VPN_SKU_<packageId>=<sku> in .env.

const config = require('../config');

async function activate(pkg, order) {
  if (!config.vpnApiUrl || !config.vpnApiKey) {
    throw new Error('VPN_API_URL / VPN_API_KEY not configured');
  }
  const key = `VPN_SKU_${pkg.id.toUpperCase().replace(/-/g, '_')}`;
  const sku = process.env[key] || pkg.vpnSku;
  if (!sku) throw new Error(`VPN SKU not mapped. Set ${key} in .env`);

  const res = await fetch(`${config.vpnApiUrl.replace(/\/$/, '')}/v1/access-keys`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.vpnApiKey}`,
    },
    body: JSON.stringify({ plan: sku, note: `DaqiAPI order ${order.id}` }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`VPN upstream failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    provider: 'vpn-reseller',
    code: data.id || `VPN-${order.id.slice(0, 12)}`,
    details: {
      username: data.username || null,
      password: data.password || null,
      configUrl: data.config_url || data.configUrl || null,
    },
    instructions: [
      'Download the VPN app for your device',
      'Log in with the credentials delivered in the order details',
      'Pick a server from 60+ locations and connect',
    ],
  };
}

module.exports = { name: 'vpn-reseller', activate };
