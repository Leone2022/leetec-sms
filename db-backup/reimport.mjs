import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const sql = readFileSync('./leetec_sms_utf8.sql', 'utf8');

// Connect without specifying a database to drop/recreate it
const conn = await mysql.createConnection({
  host: 'thomas.proxy.rlwy.net',
  port: 30331,
  user: 'root',
  password: 'eBinGeZgjYjHMrMuvUUnYgbHTSXJuZyf',
  ssl: { rejectUnauthorized: false },
  multipleStatements: true,
});

console.log('Connected — resetting database...');
await conn.query('DROP DATABASE IF EXISTS railway;');
await conn.query('CREATE DATABASE railway CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;');
await conn.query('USE railway;');
console.log('Database reset. Running dump...');

await conn.query('SET FOREIGN_KEY_CHECKS=0;');
await conn.query(sql);
await conn.query('SET FOREIGN_KEY_CHECKS=1;');

console.log('Import complete.\n');

const tables = ['Users','Roles','UserRoles','Schools','Students','Terms','Marks','Invoices'];
for (const t of tables) {
  const [rows] = await conn.query(`SELECT COUNT(*) AS cnt FROM \`${t}\`;`);
  console.log(`${t}: ${rows[0].cnt} rows`);
}

// Show all Users
const [users] = await conn.query('SELECT Id, Email, FirstName, LastName FROM Users;');
console.log('\n--- Users ---');
console.table(users);

await conn.end();
