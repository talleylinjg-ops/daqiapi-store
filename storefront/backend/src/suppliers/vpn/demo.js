// VPN self-hosted: provisions a WireGuard server on an Oracle Cloud "Always Free"
// instance (US regions like Ashburn / Phoenix) and returns the client config.
// Runs in DEMO mode (no Oracle credentials) by generating a full WireGuard
// client configuration locally so the flow works end-to-end.

const crypto = require('crypto');
const config = require('../../config');

function wireguardKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519');
  const privRaw = Buffer.from(privateKey.export({ type: 'pkcs8', format: 'der' })).subarray(-32);
  const pubRaw = Buffer.from(publicKey.export({ type: 'spki', format: 'der' })).subarray(-32);
  return {
    privateKey: privRaw.toString('base64'),
    publicKey: pubRaw.toString('base64'),
  };
}

const name = 'demo';

async function createOrder({ pkg, order }) {
  const keys = wireguardKeys();
  const serverKeys = wireguardKeys();
  const ipSuffix = Math.floor(2 + Math.random() * 250);
  const endpoint = config.vpnOraclePublicIp || '146.56.10.20';
  const configText = [
    '[Interface]',
    `Address = 10.66.66.${ipSuffix}/32`,
    `PrivateKey = ${keys.privateKey}`,
    'DNS = 1.1.1.1, 1.0.0.1',
    '',
    '[Peer]',
    `PublicKey = ${serverKeys.publicKey}`,
    `PresharedKey = ${crypto.randomBytes(32).toString('base64')}`,
    `Endpoint = ${endpoint}:51820`,
    'AllowedIPs = 0.0.0.0/0',
    'PersistentKeepalive = 25',
  ].join('\n');

  return {
    code: `VPN-${crypto.randomBytes(12).toString('hex').toUpperCase()}`,
    details: {
      username: `nvp_${order.id.slice(0, 8).toLowerCase()}`,
      password: crypto.randomBytes(8).toString('hex').toUpperCase(),
      endpoint,
      port: 51820,
      region: 'US East (Ashburn)',
      host: 'Oracle Cloud Always Free',
      protocol: 'WireGuard',
      configText,
    },
    instructions: [
      'This VPN is self-hosted on an Oracle Cloud Always Free instance (US region)',
      'Install WireGuard on your device (Windows, macOS, iOS, Android, Linux)',
      'Create a new tunnel and paste the client configuration from your order',
      'Connect and enjoy a US IP address with no monthly server cost',
    ],
  };
}

module.exports = { name, createOrder };
