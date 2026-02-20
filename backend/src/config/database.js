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
    show_on_home BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS video_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    library_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    size INTEGER,
    last_modified DATETIME,
    meta_title TEXT,
    meta_year INTEGER,
    meta_plot TEXT,
    meta_poster_url TEXT,
    meta_backdrop_url TEXT,
    meta_imdb_rating REAL,
    meta_vote_count INTEGER,
    meta_release_date TEXT,
    meta_runtime_minutes INTEGER,
    meta_genres_json TEXT,
    meta_source TEXT,
    meta_fetched_at DATETIME,
    cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE,
    UNIQUE(library_id, key)
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

// Run migrations for user management features
try {
  const tableInfo = db.pragma('table_info(users)');
  const existingColumns = tableInfo.map(col => col.name);

  // Add new columns if they don't exist
  if (!existingColumns.includes('is_admin')) {
    db.exec('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0');
    console.log('Added is_admin column');
  }
  if (!existingColumns.includes('is_active')) {
    db.exec('ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1');
    console.log('Added is_active column');
  }
  if (!existingColumns.includes('email')) {
    db.exec('ALTER TABLE users ADD COLUMN email TEXT');
    console.log('Added email column');
  }
  if (!existingColumns.includes('last_login')) {
    db.exec('ALTER TABLE users ADD COLUMN last_login DATETIME');
    console.log('Added last_login column');
  }
  if (!existingColumns.includes('login_count')) {
    db.exec('ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0');
    console.log('Added login_count column');
  }

  // Add libraries.show_on_home column if missing
  const librariesTableInfo = db.pragma('table_info(libraries)');
  const libraryColumns = librariesTableInfo.map(col => col.name);
  if (!libraryColumns.includes('show_on_home')) {
    db.exec('ALTER TABLE libraries ADD COLUMN show_on_home BOOLEAN DEFAULT 1');
    console.log('Added libraries.show_on_home column');
  }

  // Add video_cache metadata columns if missing
  const videoCacheTableInfo = db.pragma('table_info(video_cache)');
  const videoCacheColumns = videoCacheTableInfo.map(col => col.name);
  if (!videoCacheColumns.includes('meta_title')) {
    db.exec('ALTER TABLE video_cache ADD COLUMN meta_title TEXT');
    console.log('Added video_cache.meta_title column');
  }
  if (!videoCacheColumns.includes('meta_year')) {
    db.exec('ALTER TABLE video_cache ADD COLUMN meta_year INTEGER');
    console.log('Added video_cache.meta_year column');
  }
  if (!videoCacheColumns.includes('meta_plot')) {
    db.exec('ALTER TABLE video_cache ADD COLUMN meta_plot TEXT');
    console.log('Added video_cache.meta_plot column');
  }
  if (!videoCacheColumns.includes('meta_poster_url')) {
    db.exec('ALTER TABLE video_cache ADD COLUMN meta_poster_url TEXT');
    console.log('Added video_cache.meta_poster_url column');
  }
  if (!videoCacheColumns.includes('meta_backdrop_url')) {
    db.exec('ALTER TABLE video_cache ADD COLUMN meta_backdrop_url TEXT');
    console.log('Added video_cache.meta_backdrop_url column');
  }
  if (!videoCacheColumns.includes('meta_imdb_rating')) {
    db.exec('ALTER TABLE video_cache ADD COLUMN meta_imdb_rating REAL');
    console.log('Added video_cache.meta_imdb_rating column');
  }
  if (!videoCacheColumns.includes('meta_vote_count')) {
    db.exec('ALTER TABLE video_cache ADD COLUMN meta_vote_count INTEGER');
    console.log('Added video_cache.meta_vote_count column');
  }
  if (!videoCacheColumns.includes('meta_release_date')) {
    db.exec('ALTER TABLE video_cache ADD COLUMN meta_release_date TEXT');
    console.log('Added video_cache.meta_release_date column');
  }
  if (!videoCacheColumns.includes('meta_runtime_minutes')) {
    db.exec('ALTER TABLE video_cache ADD COLUMN meta_runtime_minutes INTEGER');
    console.log('Added video_cache.meta_runtime_minutes column');
  }
  if (!videoCacheColumns.includes('meta_genres_json')) {
    db.exec('ALTER TABLE video_cache ADD COLUMN meta_genres_json TEXT');
    console.log('Added video_cache.meta_genres_json column');
  }
  if (!videoCacheColumns.includes('meta_source')) {
    db.exec('ALTER TABLE video_cache ADD COLUMN meta_source TEXT');
    console.log('Added video_cache.meta_source column');
  }
  if (!videoCacheColumns.includes('meta_fetched_at')) {
    db.exec('ALTER TABLE video_cache ADD COLUMN meta_fetched_at DATETIME');
    console.log('Added video_cache.meta_fetched_at column');
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

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);
  `);

  console.log('User management schema ready');
} catch (err) {
  console.error('Failed to run user management migrations:', err);
}

// Initialize app settings defaults
try {
  db.prepare(`
    INSERT OR IGNORE INTO app_settings (key, value)
    VALUES ('allow_registrations', 'true')
  `).run();
} catch (err) {
  console.error('Failed to initialize app settings defaults:', err);
}

export default db;
