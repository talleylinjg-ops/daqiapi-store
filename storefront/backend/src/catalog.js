// Unified product catalog: merges static packages (token/vpn) with the dynamic
// eSIM catalog that is generated from cheapest wholesale prices.

const { packages, getByCategory, quotaFor } = require('./packages');
const { esimPackages } = require('./esimCatalog');

function staticPackages(category) {
  return getByCategory(category).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    product: p.product || 'api',
    note: p.note || null,
    priceUsd: p.priceUsd,
    quotaUsd: p.quotaUsd,
    quota: quotaFor(p),
    features: p.features,
    popular: p.popular,
  }));
}

async function applyOverrides(list) {
  let overrides = {};
  try {
    overrides = await require('./admin').listOverrides();
  } catch (err) {
    console.warn('[catalog] overrides unavailable:', err.message);
  }
  return list.filter((p) => {
    const ov = overrides[p.id];
    if (ov && ov.enabled === false) return false;
    return true;
  }).map((p) => {
    const ov = overrides[p.id];
    if (ov && ov.priceUsd !== null && ov.priceUsd !== undefined) {
      return { ...p, priceUsd: ov.priceUsd, priceOverride: true };
    }
    return p;
  });
}

async function getCatalog() {
  const token = await applyOverrides(staticPackages('token'));
  const vpn = await applyOverrides(staticPackages('vpn'));
  const esim = await applyOverrides(await esimPackages());
  return { token, esim, vpn };
}

async function getPackage(id) {
  const catalog = await getCatalog();
  const all = [].concat(catalog.token, catalog.esim, catalog.vpn);
  return all.find((p) => p.id === id) || null;
}

module.exports = { getCatalog, getPackage, staticPackages };
