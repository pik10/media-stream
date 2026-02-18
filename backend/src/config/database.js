import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use data directory for database in production
const dbPath = process.env.NODE_ENV === 'production'
  ? '/app/data/database.sqlite'
  : path.join(__dirname, '../../database.sqlite');

// Create database connection
let db;
try {
  db = new Database(dbPath);
  console.log('Database connection established');
} catch (err) {
  console.error('Failed to open database:', err);
  process.exit(1);
}

// Enable foreign keys
try {
  db.pragma('foreign_keys = ON');
} catch (err) {
  console.error('Failed to enable foreign keys:', err);
}

// Create tables
const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS libraries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    region TEXT NOT NULL,
    bucket TEXT NOT NULL,
    access_key_encrypted TEXT NOT NULL,
    secret_key_encrypted TEXT NOT NULL,
    path_prefix TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS video_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    library_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    size INTEGER,
    last_modified DATETIME,
    cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE,
    UNIQUE(library_id, key)
  );

  CREATE INDEX IF NOT EXISTS idx_libraries_user_id ON libraries(user_id);
  CREATE INDEX IF NOT EXISTS idx_video_cache_library_id ON video_cache(library_id);
  CREATE INDEX IF NOT EXISTS idx_video_cache_cached_at ON video_cache(cached_at);
  CREATE INDEX IF NOT EXISTS idx_video_cache_key ON video_cache(key);
  CREATE INDEX IF NOT EXISTS idx_video_cache_library_cached ON video_cache(library_id, cached_at);
`;

try {
  db.exec(schema);
  console.log('Database initialized successfully');
} catch (err) {
  console.error('Failed to create tables:', err);
  process.exit(1);
}

export default db;
