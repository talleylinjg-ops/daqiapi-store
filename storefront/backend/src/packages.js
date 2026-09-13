const config = require('./config');

const packages = [
  // ---- Category: Token (API credits) ----
  {
    id: 'starter',
    name: 'Starter',
    category: 'token',
    priceUsd: 10,
    quotaUsd: 10,
    features: ['10 USD of API credits', 'All available models', 'Email support', 'Valid forever (no expiry)'],
    popular: false,
  },
  {
    id: 'standard',
    name: 'Standard',
    category: 'token',
    priceUsd: 25,
    quotaUsd: 25,
    features: ['25 USD of API credits', 'All available models', 'Priority email support', 'Valid forever (no expiry)'],
    popular: true,
  },
  {
    id: 'advanced',
    name: 'Advanced',
    category: 'token',
    priceUsd: 50,
    quotaUsd: 50,
    features: ['50 USD of API credits', 'All available models', 'Priority email support', 'Valid forever (no expiry)'],
    popular: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    category: 'token',
    priceUsd: 100,
    quotaUsd: 100,
    features: ['100 USD of API credits', 'All available models', 'Dedicated support', 'Valid forever (no expiry)'],
    popular: false,
  },

  // ---- Category: eSIM (upstream supplier delivered) ----
  {
    id: 'esim-eu-5gb',
    name: 'eSIM Europe 5GB',
    category: 'esim',
    priceUsd: 10,
    note: '5 GB · 30 days · Europe',
    features: ['5 GB data', 'Valid for 30 days', 'Covers 40+ European countries', 'Instant eSIM QR by email'],
    popular: false,
  },
  {
    id: 'esim-global-10gb',
    name: 'eSIM Global 10GB',
    category: 'esim',
    priceUsd: 15,
    note: '10 GB · 30 days · Global',
    features: ['10 GB data', 'Valid for 30 days', 'Works in 130+ countries', 'Instant eSIM QR by email'],
    popular: true,
  },
  {
    id: 'esim-us-unlimited',
    name: 'eSIM USA Unlimited',
    category: 'esim',
    priceUsd: 30,
    note: 'Unlimited · 30 days · USA',
    features: ['Unlimited high-speed data', 'Valid for 30 days', 'US coverage only', 'Instant eSIM QR by email'],
    popular: false,
  },

  // ---- Category: VPN (upstream supplier delivered) ----
  {
    id: 'vpn-monthly',
    name: 'VPN Pro Monthly',
    category: 'vpn',
    priceUsd: 4,
    note: '1 month · 3 devices',
    features: ['Unlimited bandwidth', 'Up to 3 devices', 'No-logs policy', '60+ server locations'],
    popular: false,
  },
  {
    id: 'vpn-yearly',
    name: 'VPN Pro 1-Year',
    category: 'vpn',
    priceUsd: 20,
    note: '1 year · 5 devices',
    features: ['Unlimited bandwidth', 'Up to 5 devices', 'Strict no-logs policy', '60+ server locations', '2 months free'],
    popular: true,
  },
  {
    id: 'vpn-family',
    name: 'VPN Family Plan',
    category: 'vpn',
    priceUsd: 45,
    note: '1 year · 10 devices',
    features: ['Unlimited bandwidth', 'Up to 10 devices', 'Strict no-logs policy', '60+ server locations', 'Priority support'],
    popular: false,
  },
];

function getPackage(id) {
  return packages.find((p) => p.id === id);
}

function getByCategory(category) {
  return packages.filter((p) => p.category === category);
}

function quotaFor(pkg) {
  return (pkg.quotaUsd || 0) * config.quotaPerUnit;
}

module.exports = { packages, getPackage, getByCategory, quotaFor };
