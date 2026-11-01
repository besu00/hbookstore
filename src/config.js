require('dotenv').config();
const env = process.env;
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
    database: env.DB_NAME || 'hbookstore'
  }
};
