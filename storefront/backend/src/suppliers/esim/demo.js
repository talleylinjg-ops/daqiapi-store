// Simulated upstream suppliers used when no real eSIM API credentials are configured.
// Produces a realistic wholesale-price matrix so the comparison engine automatically
// picks the cheapest supplier for every plan.

const crypto = require('crypto');

const BASE_PRICE = {
  'eu-3gb': 4.2,
  'eu-5gb': 6.1,
  'global-3gb': 6.5,
  'global-10gb': 11.2,
  'as-5gb': 7.0,
  'us-unlimited': 21.0,
};

const SUPPLIERS = [
  { id: 'airalo', label: 'Airalo', factor: 1.0 },
  { id: 'esimgo', label: 'eSIMGo', factor: 0.93 },
  { id: 'fiveber', label: '5ber', factor: 1.07 },
];

const name = 'demo';

async function getPrices() {
  const out = [];
  for (const planKey of Object.keys(BASE_PRICE)) {
    for (const s of SUPPLIERS) {
      out.push({
        provider: s.id,
        providerLabel: s.label,
        sku: `${s.id}-${planKey}`,
        planKey,
        wholesale: Math.round(BASE_PRICE[planKey] * s.factor * 100) / 100,
        demo: true,
      });
    }
  }
  return out;
}

function hex(n) {
  return crypto.randomBytes(n).toString('hex').toUpperCase();
}

async function createOrder({ planKey, sku, order }) {
  const oid = order ? order.id.slice(0, 8) : hex(4);
  const iccid = `8944${String(1 + Math.floor(Math.random() * 9))}${hex(6)}${Math.floor(100000 + Math.random() * 900000)}${Math.floor(Math.random() * 10)}`;
  const smdp = `smdp.demo-esim.net`;
  const activationCode = `LPA:1$${smdp}$${hex(6)}-${hex(6)}`;
  return {
    code: `ESIM-${hex(12)}`,
    details: {
      iccid,
      activationCode,
      qr: `https://demo.example.net/esim/${oid}.png`,
      network: 'NovaConnect Global',
    },
    instructions: [
      `Install the eSIM profile using activation code ${activationCode}`,
      'Scan the QR delivered to your email, or enter the code manually',
      'Your plan activates when the device connects in a covered country',
      'Keep the eSIM as a secondary data line for roaming',
    ],
  };
}

module.exports = { name, getPrices, createOrder };
