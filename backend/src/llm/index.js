const path = require('path');
const Database = require('better-sqlite3');
const { generateSQL, formatResponse } = require('./gemini');
const { validateSQL } = require('./sqlValidator');

const DB_PATH = path.resolve(__dirname, '../../data/o2c.db');

/**
 * Opens a read-only connection to the SQLite database.
 */
function openDatabase() {
  return new Database(DB_PATH, { readonly: true, fileMustExist: true });
}

/**
 * Executes a validated SELECT query against the read-only SQLite database.
 *
 * @param {string} sql
 * @returns {object[]} - Array of row objects
 */
function executeSQL(sql) {
  const db = openDatabase();
  try {
    const stmt = db.prepare(sql);
    return stmt.all();
  } finally {
    db.close();
  }
}

/**
 * Full pipeline: natural language question -> SQL -> execution -> natural language answer.
 *
 * @param {string} userMessage - The user's natural language question
 * @returns {Promise<{ answer: string, sql: string|null, data: object[]|null, rejected: boolean }>}
 */
async function processQuery(userMessage) {
  // Layer 1: Gemini function calling — classify and generate SQL (or reject)
  let functionCall;
  try {
    functionCall = await generateSQL(userMessage);
  } catch (err) {
    console.error('[LLM] Gemini call failed:', err.message);
    return {
      answer:
        'Sorry, I was unable to process your question. Please try again later.',
      sql: null,
      data: null,
      rejected: false,
    };
  }

  // Handle rejection
  if (functionCall.functionName === 'reject_query') {
    const reason = functionCall.args.reason || 'Question is not related to the O2C dataset.';
    console.log('[LLM] Query rejected:', reason);
    return {
      answer: reason,
      sql: null,
      data: null,
      rejected: true,
    };
  }

  // We expect query_database from here
  const { sql, explanation } = functionCall.args;
  console.log('[LLM] Generated SQL:', sql);
  console.log('[LLM] Explanation:', explanation);

  // Layer 2: Deterministic SQL validation
  const validation = validateSQL(sql);
  if (!validation.valid) {
    console.warn('[LLM] SQL validation failed:', validation.error);
    return {
      answer: `I generated a query but it failed validation: ${validation.error}`,
      sql,
      data: null,
      rejected: false,
    };
  }

  // Layer 3: Execute against read-only SQLite
  let rows;
  try {
    rows = executeSQL(sql);
  } catch (err) {
    console.error('[LLM] SQL execution error:', err.message);
    return {
      answer: `The query failed to execute: ${err.message}`,
      sql,
      data: null,
      rejected: false,
    };
  }

  console.log(`[LLM] Query returned ${rows.length} row(s)`);

  // Layer 4: Format response via Gemini
  let answer;
  try {
    answer = await formatResponse(userMessage, sql, rows);
  } catch (err) {
    console.error('[LLM] Response formatting failed:', err.message);
    // Fall back to a basic answer with the raw data
    answer =
      rows.length === 0
        ? 'The query returned no results.'
        : `The query returned ${rows.length} row(s). Here is the data: ${JSON.stringify(rows.slice(0, 10))}`;
  }

  return {
    answer,
    sql,
    data: rows,
    rejected: false,
  };
}

module.exports = { processQuery };
