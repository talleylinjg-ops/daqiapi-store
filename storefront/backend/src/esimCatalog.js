// eSIM comparison engine.
// Fetches wholesale prices from every configured upstream supplier, picks the
// cheapest option per plan, applies a retail margin and generates the product
// catalog customers see.

const config = require('./config');
const { fetchAllPrices, getProvider } = require('./suppliers/esim/providers');

const PLANS = [
  { key: 'eu-3gb', region: 'europe', data: 3, validity: 15 },
  { key: 'eu-5gb', region: 'europe', data: 5, validity: 30 },
  { key: 'global-3gb', region: 'global', data: 3, validity: 15 },
  { key: 'global-10gb', region: 'global', data: 10, validity: 30 },
  { key: 'as-5gb', region: 'asia', data: 5, validity: 30 },
  { key: 'us-unlimited', region: 'usa', data: 0, validity: 30 },
];

const REGION_NAMES = {
  europe: 'Europe',
  global: 'Global',
  asia: 'Asia Pacific',
  usa: 'USA',
};

const MARGIN_RATE = config.esimMargin;

function dataLabel(plan) {
  return plan.data > 0 ? `${plan.data} GB` : 'Unlimited high-speed';
}

function planName(plan) {
  const region = REGION_NAMES[plan.region] || plan.region;
  return plan.data > 0 ? `${region} ${plan.data}GB` : `Unlimited ${region}`;
}

async function compare() {
  const prices = await fetchAllPrices();
  return PLANS.map((plan) => {
    const options = prices
      .filter((p) => p.planKey === plan.key)
      .map((p) => ({
        provider: p.provider,
        providerLabel: p.providerLabel,
        sku: p.sku,
        wholesale: p.wholesale,
        demo: !!p.demo,
      }))
      .sort((a, b) => a.wholesale - b.wholesale);
    const best = options[0] || null;
    const retail = best ? Math.round(best.wholesale * (1 + MARGIN_RATE) * 100) / 100 : null;
    return {
      key: plan.key,
      name: planName(plan),
      region: plan.region,
      regionName: REGION_NAMES[plan.region] || plan.region,
      data: plan.data,
      dataLabel: dataLabel(plan),
      validity: plan.validity,
      options,
      best,
      retail,
    };
  });
}

async function esimPackages() {
  const rows = await compare();
  return rows.map((r) => ({
    id: `esim-${r.key}`,
    name: r.name,
    category: 'esim',
    region: r.region,
    priceUsd: r.retail,
    note: `${r.dataLabel} data \u00b7 ${r.validity} days \u00b7 ${r.regionName}`,
    features: [
      `${r.dataLabel} data`,
      `Valid for ${r.validity} days`,
      `${r.regionName} coverage`,
      'Instant eSIM QR by email',
      `Sourced from ${r.best ? r.best.providerLabel : 'our'} network at best wholesale price`,
    ],
    popular: r.key === 'global-10gb',
    planKey: r.key,
    bestProvider: r.best ? r.best.provider : null,
    bestSku: r.best ? r.best.sku : null,
    wholesale: r.best ? r.best.wholesale : null,
  }));
}

async function fulfillEsim(planKey, order) {
  const rows = await compare();
  const row = rows.find((r) => r.key === planKey);
  if (!row || !row.best) {
    throw new Error(`Plan ${planKey} is not available`);
  }
  const providerMod = await getProvider(row.best.provider);
  const activation = await providerMod.createOrder({ planKey, sku: row.best.sku, order });
  return {
    ...activation,
    provider: row.best.provider,
    providerLabel: row.best.providerLabel,
    sku: row.best.sku,
    wholesale: row.best.wholesale,
    retail: row.retail,
    margin: Math.round((row.retail - row.best.wholesale) * 100) / 100,
  };
}

module.exports = { compare, esimPackages, fulfillEsim };
