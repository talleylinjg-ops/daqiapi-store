// VPN supplier dispatcher.
//   VPN_PROVIDER=oracle   -> deploy WireGuard on an Oracle Cloud Always Free US instance
//   VPN_PROVIDER=reseller -> generic HTTP reseller API
//   otherwise             -> demo provider (generates a full client config locally)

const config = require('../../config');
const demo = require('./demo');
const oracle = require('./oracle');
const reseller = require('../vpnReseller');

async function fulfill(pkg, order) {
  const mode = (config.vpnProvider || '').toLowerCase();
  let provider;
  if (mode === 'oracle') provider = oracle;
  else if (mode === 'reseller' || mode === 'http') provider = reseller;
  else provider = demo;

  let result;
  if (mode === 'reseller' || mode === 'http') {
    result = await provider.activate(pkg, order);
    return { ...result, provider: 'vpn-reseller' };
  }
  result = await provider.createOrder({ pkg, order });
  return { ...result, provider: provider.name };
}

module.exports = { fulfill };
