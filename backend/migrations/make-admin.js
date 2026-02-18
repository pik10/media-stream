import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.NODE_ENV === 'production'
  ? '/app/data/database.sqlite'
  : path.join(__dirname, '../database.sqlite');

const username = process.argv[2];

if (!username) {
  console.error('Usage: node make-admin.js <username>');
  process.exit(1);
}

const db = new Database(dbPath);

try {
  const result = db.prepare('UPDATE users SET is_admin = 1 WHERE username = ?').run(username);

  if (result.changes === 0) {
    console.error(`❌ User "${username}" not found`);
    process.exit(1);
  }

  console.log(`✅ User "${username}" is now an admin`);
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
} finally {
  db.close();
}
