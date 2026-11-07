# H Book Store – Telegram Mini App (Node.js + MySQL)

## Structure
```
src/server.js   Express app, security headers, static files, bot start
src/routes.js   REST API (books, favorites, stats, admin upload/delete)
src/auth.js     Telegram initData HMAC verification + admin check
src/bot.js      Telegraf bot (/start button + menu button)
schema.sql      MySQL tables + seed data
public/         Mini App frontend (index.html, css, js, assets)
uploads/        Uploaded PDFs and covers (served at /files)
```

## Setup
1. `npm install`
2. Start MySQL (`docker compose up -d` or your own server).
3. `cp .env.example .env` and fill in DB password, `BOT_TOKEN`, `ADMIN_IDS`, `PUBLIC_URL`.
4. `npm run migrate`  (creates DB, tables, sample data)
5. `npm start`
6. Expose it over HTTPS (domain + nginx/Caddy, or `cloudflared tunnel` / ngrok while testing).
7. In @BotFather: `/newapp` (or set the menu button URL) to your `PUBLIC_URL`.
8. Send `/start` to your bot. Your Telegram ID (from ADMIN_IDS) sees the **Admin** tab.

Local browser testing: with `DEV_AUTH=true` and NODE_ENV not `production`, http://localhost:3000 works without Telegram.

## Production notes
- Set `NODE_ENV=production` (disables DEV_AUTH). Run with pm2 or systemd behind HTTPS.
- Put nginx `client_max_body_size 50m;` for PDF uploads.
- Back up the `uploads/` folder together with the MySQL database.

## Deploy on Render + Aiven MySQL
Tables are created automatically on every start (`src/migrate.js`), so no manual migrate step is needed.

Render → Environment variables:
```
NODE_ENV=production
PUBLIC_URL=https://<your-service>.onrender.com
DB_HOST=<aiven host>        DB_PORT=<aiven port>
DB_USER=avnadmin            DB_PASSWORD=<aiven password>
DB_NAME=defaultdb           DB_SSL=true
BOT_TOKEN=<from BotFather>  ADMIN_IDS=<your telegram id>
```
Build command `yarn install` (or `npm install`), start command `yarn start` (or `npm start`).
`certs/ca.pem` (Aiven's public CA) is committed and used automatically.

**Uploads:** Render's disk is ephemeral - uploaded PDFs/covers vanish on redeploy/restart unless you attach a
persistent disk mounted at `/opt/render/project/src/uploads`. Alternatively add books by external link.
