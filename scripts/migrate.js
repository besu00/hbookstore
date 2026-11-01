// Creates the database, tables and seed data:  npm run migrate
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { db } = require('../src/config');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8').replace(/hbookstore/g, db.database);
  const conn = await mysql.createConnection({ host: db.host, port: db.port, user: db.user, password: db.password, multipleStatements: true });
  await conn.query(sql);
  await conn.end();
  console.log(`Database "${db.database}" is ready.`);
})().catch(e => { console.error(e.message); process.exit(1); });
