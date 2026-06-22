import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const conn = await mysql.createConnection({
  host: 'thomas.proxy.rlwy.net',
  port: 30331,
  user: 'root',
  password: 'eBinGeZgjYjHMrMuvUUnYgbHTSXJuZyf',
  database: 'railway',
  ssl: { rejectUnauthorized: false },
});

console.log('Connected to Railway MySQL\n');

// 1. List all users
const [users] = await conn.query('SELECT Id, Email, FirstName, LastName FROM Users;');
console.log('--- Users ---');
console.table(users);

// 2. Generate BCrypt hash for Admin@123
const hash = await bcrypt.hash('Admin@123', 12);
console.log('\nGenerated hash:', hash);

// 3. Update admin user
const [result] = await conn.query(
  "UPDATE Users SET PasswordHash = ? WHERE Email = 'admin@leetec.com';",
  [hash]
);
console.log(`\nRows updated: ${result.affectedRows}`);

// 4. Verify
const [updated] = await conn.query(
  "SELECT Id, Email, FirstName, LastName, PasswordHash FROM Users WHERE Email = 'admin@leetec.com';"
);
console.log('\n--- Updated record ---');
console.table(updated);

await conn.end();
