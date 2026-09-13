// Real provisioning: deploys WireGuard to an Oracle Cloud Always Free instance
// over SSH and returns the client configuration.
// Enabled when VPN_PROVIDER=oracle.
//
// Env:
//   VPN_ORACLE_HOST, VPN_ORACLE_USER, VPN_ORACLE_PORT, VPN_ORACLE_KEY_FILE
//   VPN_ORACLE_PUBLIC_IP  (public IP of the free-tier instance, US region)
//
// The provisioning script is idempotent per order id: if a client config for
// the order already exists on the server it is reused instead of re-created.

const { execFileSync } = require('child_process');
const config = require('../../config');

const name = 'oracle';

const PROVISION_SCRIPT = String.raw`
set -e
WG=/etc/wireguard
CLIENTS=$WG/clients
mkdir -p $CLIENTS
ID=$(printf %s "$1" | tr 'A-Z' 'a-z' | tr -cd 'a-z0-9')
CFG=$CLIENTS/$ID.conf
if [ -f "$CFG" ]; then cat "$CFG"; exit 0; fi
if ! command -v wg >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y wireguard qrencode
fi
SIP=\${2:-10.66.66.1}
if [ ! -f $WG/wg0.conf ]; then
  umask 077
  wg genkey | tee $WG/server_private | wg pubkey > $WG/server_public
  NEXT=2
  cat > $WG/wg0.conf <<EOF
[Interface]
PrivateKey = $(cat $WG/server_private)
Address = $SIP/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -A FORWARD -o wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -D FORWARD -o wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
EOF
  sysctl -w net.ipv4.ip_forward=1
  systemctl enable wg-quick@wg0
  systemctl restart wg-quick@wg0
fi
CPRIV=$(wg genkey)
CPUB=$(printf '%s' "$CPRIV" | wg pubkey)
CIDX=$(( 3 + $(ls $CLIENTS | wc -l) ))
cat >> $WG/wg0.conf <<EOF

[Peer]
PublicKey = $CPUB
AllowedIPs = 10.66.66.$CIDX/32
EOF
wg syncconf wg0 <(wg-quick strip wg0)
SPUB=$(cat $WG/server_public)
cat > $CFG <<EOF
[Interface]
PrivateKey = $CPRIV
Address = 10.66.66.$CIDX/32
DNS = 1.1.1.1, 1.0.0.1

[Peer]
PublicKey = $SPUB
Endpoint = $3:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
EOF
cat $CFG
`;

function sshBase() {
  const args = [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ConnectTimeout=15',
    '-p', String(config.vpnOraclePort),
  ];
  if (config.vpnOracleKeyFile) {
    args.push('-i', config.vpnOracleKeyFile);
  }
  args.push(`${config.vpnOracleUser}@${config.vpnOracleHost}`);
  return args;
}

async function createOrder({ pkg, order }) {
  if (!config.vpnOracleHost || !config.vpnOracleUser) {
    throw new Error('VPN_ORACLE_HOST / VPN_ORACLE_USER not configured');
  }
  const endpoint = config.vpnOraclePublicIp || config.vpnOracleHost;
  let configText;
  try {
    configText = execFileSync('ssh', [...sshBase(), `bash -s ${order.id} ${'10.66.66.1'} ${endpoint}`], {
      input: PROVISION_SCRIPT,
      encoding: 'utf8',
      timeout: 120000,
    }).trim();
  } catch (err) {
    throw new Error(`Oracle provisioning failed: ${err.stderr || err.message}`);
  }
  return {
    code: `VPN-${order.id.slice(0, 12)}`,
    details: {
      endpoint,
      port: 51820,
      region: 'Oracle Cloud Always Free (US)',
      host: config.vpnOracleHost,
      protocol: 'WireGuard',
      configText,
    },
    instructions: [
      'Install WireGuard on your device',
      'Create a new tunnel and paste the client configuration from your order',
      'Connect and enjoy a US IP address at no monthly server cost',
    ],
  };
}

module.exports = { name, createOrder };
