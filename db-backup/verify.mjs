import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const conn = await mysql.createConnection({
  host: 'thomas.proxy.rlwy.net',
  port: 30331,
  user: 'root',
  password: 'eBinGeZgjYjHMrMuvUUnYgbHTSXJuZyf',
  database: 'railway',
  ssl: { rejectUnauthorized: false },
  multipleStatements: true,
});

// Show all tables and row counts
const [tables] = await conn.query('SHOW TABLES;');
console.log('Tables in railway:');
for (const row of tables) {
  const tbl = Object.values(row)[0];
  const [cnt] = await conn.query(`SELECT COUNT(*) AS n FROM \`${tbl}\`;`);
  console.log(`  ${tbl}: ${cnt[0].n} rows`);
}

// Show users
const [users] = await conn.query('SELECT Id, Email, FirstName, LastName FROM users;');
console.log('\n--- Users ---');
console.table(users);

// Reset admin password
const hash = await bcrypt.hash('Admin@123', 12);
const [result] = await conn.query(
  "UPDATE users SET PasswordHash = ? WHERE Email = 'admin@leetec.com';",
  [hash]
);
console.log(`\nPassword reset — rows updated: ${result.affectedRows}`);

if (result.affectedRows === 0) {
  // Try to find the admin by any email
  const [admins] = await conn.query(
    "SELECT Id, Email, FirstName, LastName FROM users LIMIT 10;"
  );
  console.log('All users found:');
  console.table(admins);
}

await conn.end();
