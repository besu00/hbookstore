const mysql = require('mysql2/promise');
const { db } = require('./config');
module.exports = mysql.createPool({ ...db, charset: 'utf8mb4', waitForConnections: true, connectionLimit: 10 });
