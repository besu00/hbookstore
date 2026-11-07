const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const pool = require('./db');
const routes = require('./routes');
const startBot = require('./bot');
const migrate = require('./migrate');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  frameguard: false, // Telegram web clients embed the app in an iframe
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://telegram.org'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'self'", 'https://web.telegram.org', 'https://*.telegram.org'],
      objectSrc: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));
app.use('/api', routes);
app.use('/files', express.static(path.join(__dirname, '..', 'uploads'), { index: false, dotfiles: 'deny', maxAge: '7d' }));
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: config.isProd ? '1h' : 0 }));
app.get('/healthz', (req, res) => res.send('ok'));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const client = err.name === 'MulterError' || err.message === 'Invalid file type';
  if (!client) console.error(err);
  res.status(client ? 400 : 500).json({ error: client ? err.message : 'Server error' });
});

(async () => {
  await migrate();               // create tables if missing (also fails fast if the DB is unreachable)
  await pool.query('SELECT 1');
  app.listen(config.port, () => console.log(`H Book Store running on :${config.port}`));
  startBot();
})().catch(e => { console.error('Startup failed:', e.message); process.exit(1); });
