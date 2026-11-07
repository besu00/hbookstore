const crypto = require('crypto');
const config = require('./config');
const pool = require('./db');

// Validates Telegram WebApp initData (HMAC-SHA256 with the bot token)
function verifyInitData(initData) {
  if (!initData || !config.botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const dataCheck = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(config.botToken).digest();
  const calc = crypto.createHmac('sha256', secret).update(dataCheck).digest('hex');
  const a = Buffer.from(calc, 'hex'), b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Date.now() / 1000 - Number(params.get('auth_date') || 0) > 86400) return null; // older than 24h
  try { return JSON.parse(params.get('user')); } catch { return null; }
}

async function auth(req, res, next) {
  try {
    const h = req.get('authorization') || '';
    let user = h.startsWith('tma ') ? verifyInitData(h.slice(4)) : null;
    if (!user && !config.isProd && config.devAuth) {
      user = { id: Number(config.adminIds[0]) || 1, first_name: 'Dev', username: 'dev' };
    }
    if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });

    await pool.query(
      `INSERT INTO users (id, first_name, username, language_code) VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE first_name=VALUES(first_name), username=VALUES(username),
                               language_code=VALUES(language_code), last_seen=NOW()`,
      [user.id, user.first_name || '', user.username || null, user.language_code || null]
    );
    req.user = { ...user, isAdmin: config.adminIds.includes(String(user.id)) };
    next();
  } catch (e) { next(e); }
}

const adminOnly = (req, res, next) => (req.user?.isAdmin ? next() : res.status(403).json({ error: 'forbidden' }));

module.exports = { auth, adminOnly, verifyInitData };
