const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const isRealStripe = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_');

module.exports = {
  port: parseInt(process.env.PORT || '3001', 10),
  oneApiDb: process.env.ONE_API_DB || '/opt/one-api/one-api.db',
  quotaPerUnit: parseInt(process.env.QUOTA_PER_UNIT || '500000', 10),
  demoMode: !isRealStripe,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  adminToken: process.env.ADMIN_TOKEN || 'admin123',
  baseUrl: process.env.APP_BASE_URL || '',

  esimProvider: process.env.ESIM_PROVIDER || '',
  esimProviders: (process.env.ESIM_PROVIDER || '').toLowerCase(),
  esimMargin: parseFloat(process.env.ESIM_MARGIN || '0.18'),
  esimAiraloClientId: process.env.ESIM_AIRALO_CLIENT_ID || '',
  esimAiraloClientSecret: process.env.ESIM_AIRALO_CLIENT_SECRET || '',
  esimAiraloBaseUrl: process.env.ESIM_AIRALO_BASE_URL || '',
  esimgoApiKey: process.env.ESIMGO_API_KEY || '',
  esimgoApiUrl: process.env.ESIMGO_API_URL || '',
  vpnProvider: process.env.VPN_PROVIDER || '',
  vpnApiUrl: process.env.VPN_API_URL || '',
  vpnApiKey: process.env.VPN_API_KEY || '',
  vpnOracleHost: process.env.VPN_ORACLE_HOST || '',
  vpnOracleUser: process.env.VPN_ORACLE_USER || '',
  vpnOraclePort: parseInt(process.env.VPN_ORACLE_PORT || '22', 10),
  vpnOracleKeyFile: process.env.VPN_ORACLE_KEY_FILE || '',
  vpnOraclePublicIp: process.env.VPN_ORACLE_PUBLIC_IP || '',

  mysqlHost: process.env.MYSQL_HOST || '127.0.0.1',
  mysqlPort: parseInt(process.env.MYSQL_PORT || '3306', 10),
  mysqlUser: process.env.MYSQL_USER || 'daqiapi',
  mysqlPassword: process.env.MYSQL_PASSWORD || 'DaqiDB@2026',
  mysqlDatabase: process.env.MYSQL_DB || 'daqiapi',
};
