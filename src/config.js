require('dotenv').config();
const fs = require('fs');
const path = require('path');
const env = process.env;

// Aiven (and most cloud MySQL) REQUIRE SSL. CA can come from DB_CA (PEM text), DB_CA_PATH (file),
// or the bundled certs/ca.pem. If none is found we still encrypt, but skip certificate verification.
function sslOptions() {
  if (env.DB_SSL !== 'true') return undefined;
  let ca;
  if (env.DB_CA) ca = env.DB_CA.replace(/\\n/g, '\n');
  else {
    const file = path.resolve(env.DB_CA_PATH || 'certs/ca.pem');
    if (fs.existsSync(file)) ca = fs.readFileSync(file, 'utf8');
    else console.warn(`DB CA file not found (${file}) - connecting with SSL but without certificate verification`);
  }
  return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false };
}

module.exports = {
  isProd: env.NODE_ENV === 'production',
  port: Number(env.PORT) || 3000,
  publicUrl: (env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, ''),
  botToken: env.BOT_TOKEN || '',
  adminIds: (env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean),
  devAuth: env.DEV_AUTH === 'true',
  db: {
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'hbookstore',
    ssl: sslOptions()
  }
};
