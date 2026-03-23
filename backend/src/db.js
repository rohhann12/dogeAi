const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'o2c.db');

let db;
try {
  db = new Database(DB_PATH, { readonly: true });
  db.pragma('journal_mode = WAL');
  console.log(`[db] Connected to SQLite database at ${DB_PATH}`);
} catch (err) {
  console.error(`[db] Failed to open database at ${DB_PATH}:`, err.message);
  process.exit(1);
}

/**
 * Execute a read-only SELECT query and return the result rows.
 * Rejects any statement that is not a SELECT.
 */
function executeQuery(sql) {
  const trimmed = sql.trim();
  if (!/^SELECT\b/i.test(trimmed)) {
    throw new Error('Only SELECT statements are allowed');
  }
  const stmt = db.prepare(trimmed);
  return stmt.all();
}

module.exports = { db, executeQuery };
