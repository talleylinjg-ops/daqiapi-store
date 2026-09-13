// Demo provider used when no upstream supplier credentials are configured.
// Generates realistic activation artifacts so the storefront works end-to-end.

const crypto = require('crypto');

function hex(n) {
  return crypto.randomBytes(n).toString('hex').toUpperCase();
}

function genCode(prefix) {
  return `${prefix}-${hex(12)}`;
}

async function activate(pkg, order) {
  const oid = order ? order.id.slice(0, 8) : hex(4);
  if (pkg.category === 'esim') {
    const iccid = `8944${String(1 + Math.floor(Math.random() * 9))}${hex(6)}${Math.floor(100000 + Math.random() * 900000)}${Math.floor(Math.random() * 10)}`;
    const smdp = `smdp.example.net`;
    const activationCode = `LPA:1$${smdp}$${hex(6)}-${hex(6)}`;
    return {
      provider: 'mock-esim',
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

  if (pkg.category === 'vpn') {
    const creds = {
      username: `nvp_${oid.toLowerCase()}`,
      password: hex(8),
    };
    return {
      provider: 'mock-vpn',
      code: `VPN-${hex(12)}`,
      details: {
        username: creds.username,
        password: creds.password,
        configUrl: `https://demo.example.net/vpn/${oid}.ovpn`,
        protocols: ['OpenVPN', 'WireGuard'],
      },
      instructions: [
        'Download the app for your device and log in with the credentials above',
        `Username: ${creds.username}`,
        `Password: ${creds.password}`,
        'Pick a server from 60+ locations and connect',
      ],
    };
  }

  return { provider: 'mock', code: genCode('CODE') };
}

module.exports = { name: 'mock', activate };
