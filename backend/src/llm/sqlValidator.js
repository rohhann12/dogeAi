const { Parser } = require('node-sql-parser');
const { ALLOWED_TABLES } = require('./schema');

const parser = new Parser();

const allowedTableSet = new Set(ALLOWED_TABLES.map((t) => t.toLowerCase()));

/**
 * Validates a SQL string against guardrail rules:
 * - Must be a SELECT statement (no INSERT/UPDATE/DELETE/DROP/ALTER/CREATE)
 * - Must reference only allowed tables
 * - Must have a FROM clause (rejects bare SELECT 'literal')
 *
 * @param {string} sql - The SQL query to validate
 * @returns {{ valid: boolean, error?: string }}
 */
function validateSQL(sql) {
  let ast;
  try {
    ast = parser.astify(sql, { database: 'SQLite' });
  } catch (err) {
    return { valid: false, error: `SQL parse error: ${err.message}` };
  }

  // parser.astify can return an array for multi-statement SQL
  const statements = Array.isArray(ast) ? ast : [ast];

  if (statements.length !== 1) {
    return { valid: false, error: 'Only a single SQL statement is allowed.' };
  }

  const stmt = statements[0];

  // Layer 2a: Must be SELECT only
  if (!stmt.type || stmt.type.toLowerCase() !== 'select') {
    return {
      valid: false,
      error: `Only SELECT statements are allowed. Got: ${stmt.type}`,
    };
  }

  // Layer 2b: Must have a FROM clause (rejects bare SELECT 'Paris')
  if (!stmt.from || stmt.from.length === 0) {
    return {
      valid: false,
      error: 'Query must reference a table (FROM clause required).',
    };
  }

  // Layer 2c: Verify all referenced tables are in the allowed list
  let tables;
  try {
    tables = parser.tableList(sql, { database: 'SQLite' });
  } catch (err) {
    return { valid: false, error: `Failed to extract tables: ${err.message}` };
  }

  // tableList returns entries like "select::null::table_name" or "select::schema::table_name"
  for (const entry of tables) {
    const parts = entry.split('::');
    const tableName = parts[parts.length - 1].toLowerCase();

    if (!allowedTableSet.has(tableName)) {
      return {
        valid: false,
        error: `Table "${tableName}" is not in the allowed list.`,
      };
    }
  }

  return { valid: true };
}

module.exports = { validateSQL };
