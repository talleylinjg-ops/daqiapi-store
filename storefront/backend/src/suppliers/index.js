// Upstream supplier registry.
//   - 'token': never goes upstream; redemption codes are created in the One API DB.
//   - 'esim': multi-supplier price comparison, cheapest wholesale auto-selected
//             (see suppliers/esim and src/esimCatalog.js).
//   - 'vpn':  self-hosted WireGuard on Oracle Cloud Always Free (or demo provider).

const esim = require('./esim/providers');
const vpn = require('./vpn');
const esimCatalog = require('../esimCatalog');

async function fulfill(pkg, order) {
  if (pkg.category === 'esim') {
    return esimCatalog.fulfillEsim(pkg.planKey, order);
  }
  if (pkg.category === 'vpn') {
    return vpn.fulfill(pkg, order);
  }
  const demo = require('./mock');
  const result = await demo.activate(pkg, order);
  return { code: result.code, details: result.details, instructions: result.instructions };
}

module.exports = { fulfill, esim, vpn };
