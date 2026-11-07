// Creates tables (and sample data on a fresh DB). Safe to run on every start.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { db } = require('./config');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
  .replace(/^\s*(CREATE DATABASE|USE)\b.*$/gim, ''); // DB already exists on managed hosts (e.g. defaultdb)

module.exports = async function migrate() {
  const conn = await mysql.createConnection({
    host: db.host, port: db.port, user: db.user, password: db.password,
    database: db.database, ssl: db.ssl, charset: 'utf8mb4', multipleStatements: true
  });
  try {
    await conn.query(read('schema.sql'));
    const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM categories');
    if (n === 0) await conn.query(read('seed.sql'));
  } finally { await conn.end(); }
  console.log(`Database "${db.database}" is ready.`);
};
