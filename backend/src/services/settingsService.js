import db from '../config/database.js';

function parseBoolean(value, fallback = true) {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

export const settingsService = {
  getAllowRegistrations() {
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('allow_registrations');
    return parseBoolean(row?.value, true);
  },

  setAllowRegistrations(enabled) {
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('allow_registrations', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).run(enabled ? 'true' : 'false');
  },

  getAdminSettings() {
    return {
      allowRegistrations: this.getAllowRegistrations()
    };
  }
};
