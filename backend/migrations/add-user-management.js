import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use same database path as main app
const dbPath = process.env.NODE_ENV === 'production'
  ? '/app/data/database.sqlite'
  : path.join(__dirname, '../database.sqlite');

console.log('Running user management migration...');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

try {
  // Check if columns already exist
  const tableInfo = db.pragma('table_info(users)');
  const existingColumns = tableInfo.map(col => col.name);

  const migrations = [];

  // Add new columns if they don't exist
  if (!existingColumns.includes('is_admin')) {
    migrations.push('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0');
  }
  if (!existingColumns.includes('is_active')) {
    migrations.push('ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1');
  }
  if (!existingColumns.includes('email')) {
    migrations.push('ALTER TABLE users ADD COLUMN email TEXT');
  }
  if (!existingColumns.includes('last_login')) {
    migrations.push('ALTER TABLE users ADD COLUMN last_login DATETIME');
  }
  if (!existingColumns.includes('login_count')) {
    migrations.push('ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0');
  }

  // Execute column additions
  for (const migration of migrations) {
    console.log('Executing:', migration);
    db.exec(migration);
  }

  // Create user_activity table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('Created user_activity table');

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);
  `);
  console.log('Created indexes');

  console.log('\n✅ Migration completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Make your first user an admin by running:');
  console.log('   node migrations/make-admin.js <username>');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
