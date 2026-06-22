import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const sql = readFileSync('./leetec_sms_export.sql', 'utf8');

// Split on statement delimiters, skip blank/comment-only chunks
const statements = sql
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

const conn = await mysql.createConnection({
  host: 'thomas.proxy.rlwy.net',
  port: 30331,
  user: 'root',
  password: 'eBinGeZgjYjHMrMuvUUnYgbHTSXJuZyf',
  database: 'railway',
  multipleStatements: false,
  ssl: { rejectUnauthorized: false },
});

console.log('Connected to Railway MySQL');

let ok = 0, skip = 0;
for (const stmt of statements) {
  try {
    await conn.query(stmt);
    ok++;
  } catch (e) {
    // Ignore "already exists" type errors from re-importing
    if (e.code === 'ER_TABLE_EXISTS_ERROR' || e.code === 'ER_DUP_ENTRY') {
      skip++;
    } else {
      console.warn(`WARN [${e.code}]: ${e.sqlMessage ?? e.message}`);
      skip++;
    }
  }
}

console.log(`Done — ${ok} statements executed, ${skip} skipped/warned`);

const [rows] = await conn.query('SHOW TABLES;');
console.log('\nTables in railway database:');
rows.forEach(r => console.log(' -', Object.values(r)[0]));

await conn.end();
