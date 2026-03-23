const {
  GoogleGenerativeAI,
  SchemaType,
} = require('@google/generative-ai');
const { SYSTEM_PROMPT, FORMAT_RESPONSE_PROMPT } = require('./schema');

/**
 * Returns a configured GoogleGenerativeAI instance.
 * Deferred so the env var can be loaded via dotenv before first use.
 */
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to your .env file.'
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

// -- Function declarations for Gemini function calling (Layer 1) --

const functionDeclarations = [
  {
    name: 'query_database',
    description:
      'Generate a SQL query to answer the user question and provide an explanation of what the query does.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        sql: {
          type: SchemaType.STRING,
          description: 'The SQLite-compatible SELECT query to execute.',
        },
        explanation: {
          type: SchemaType.STRING,
          description:
            'A brief explanation of what this query does and why it answers the question.',
        },
      },
      required: ['sql', 'explanation'],
    },
  },
  {
    name: 'reject_query',
    description:
      'Reject a user question that is not related to the SAP Order-to-Cash dataset.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        reason: {
          type: SchemaType.STRING,
          description: 'The reason the question was rejected.',
        },
      },
      required: ['reason'],
    },
  },
];

/**
 * Pass 1: Ask Gemini to generate a SQL query (or reject the question)
 * via function calling.
 */
async function generateSQL(userMessage) {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations }],
    generationConfig: {
      temperature: 0,
    },
  });

  const result = await model.generateContent(userMessage);
  const response = result.response;

  const candidate = response.candidates?.[0];
  const part = candidate?.content?.parts?.[0];

  if (!part?.functionCall) {
    const textContent = response.text?.() || '';
    throw new Error(
      `Gemini did not return a function call. Text response: ${textContent}`
    );
  }

  return {
    functionName: part.functionCall.name,
    args: part.functionCall.args,
  };
}

/**
 * Pass 2: Send the SQL results back to Gemini to format a natural language answer.
 */
async function formatResponse(userMessage, sql, rows) {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: FORMAT_RESPONSE_PROMPT,
    generationConfig: {
      temperature: 0,
    },
  });

  const MAX_ROWS = 100;
  const truncated = rows.length > MAX_ROWS;
  const displayRows = truncated ? rows.slice(0, MAX_ROWS) : rows;

  const prompt = [
    `User question: ${userMessage}`,
    '',
    `SQL query executed:`,
    sql,
    '',
    `Results (${rows.length} row${rows.length !== 1 ? 's' : ''}${truncated ? `, showing first ${MAX_ROWS}` : ''}):`,
    JSON.stringify(displayRows, null, 2),
  ].join('\n');

  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = { generateSQL, formatResponse };
