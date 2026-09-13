// eSIM upstream supplier registry + cached wholesale price fetching.
// Configured via ESIM_PROVIDER (comma separated). With no provider configured,
// the demo provider simulates multiple suppliers so the comparison engine works end-to-end.
//
// Provider interface:
//   name            string
//   getPrices()     -> [{ provider, providerLabel, sku, planKey, wholesale, demo }]
//   createOrder({planKey, sku, order}) -> activation result

const config = require('../../config');
const demo = require('./demo');
const airalo = require('./airalo');
const esimgo = require('./esimgo');

const CACHE_TTL_MS = 10 * 60 * 1000;
let cache = { ts: 0, prices: null };

function configuredProviders() {
  const names = config.esimProviders
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const map = { airalo, esimgo };
  const list = names.map((n) => map[n]).filter(Boolean);
  return list.length ? list : [demo];
}

async function fetchAllPrices() {
  if (cache.prices && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.prices;
  }
  const providers = configuredProviders();
  const results = await Promise.allSettled(providers.map((p) => p.getPrices()));
  const prices = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      prices.push(...r.value);
    } else {
      console.error(`[esim][${providers[i].name}] price fetch failed:`, r.reason.message);
    }
  });
  cache = { ts: Date.now(), prices };
  return prices;
}

async function getProvider(name) {
  const p = configuredProviders().find((x) => x.name === name);
  return p || demo;
}

module.exports = { fetchAllPrices, getProvider, configuredProviders };
