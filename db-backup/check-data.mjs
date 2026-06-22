import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: 'thomas.proxy.rlwy.net',
  port: 30331,
  user: 'root',
  password: 'eBinGeZgjYjHMrMuvUUnYgbHTSXJuZyf',
  database: 'railway',
  ssl: { rejectUnauthorized: false },
});

const tables = ['Users','Roles','UserRoles','Schools','Students','Terms'];
for (const t of tables) {
  const [rows] = await conn.query(`SELECT COUNT(*) AS cnt FROM \`${t}\`;`);
  console.log(`${t}: ${rows[0].cnt} rows`);
}

await conn.end();
