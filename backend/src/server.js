require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const { db, executeQuery } = require('./db');

// Attempt to load the LLM module; fall back to a no-op if dependencies are not
// ready yet (e.g. missing Gemini API key or unresolved imports).
let processQuery;
try {
  processQuery = require('./llm/index').processQuery;
} catch (err) {
  console.warn('[server] Could not load LLM module:', err.message);
  console.warn('[server] Chat endpoint will return a placeholder response.');
  processQuery = async () => ({
    answer: 'The LLM module is not available yet. Please configure it and restart.',
    sql: null,
    data: null,
  });
}

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });
  next();
});

// ---------------------------------------------------------------------------
// Graph data cache
// ---------------------------------------------------------------------------
const GRAPH_PATH = path.join(__dirname, '..', 'data', 'graph.json');
let graphCache = null;

function getGraph() {
  if (!graphCache) {
    const raw = fs.readFileSync(GRAPH_PATH, 'utf-8');
    graphCache = JSON.parse(raw);
    console.log(
      `[graph] Loaded graph.json — ${graphCache.nodes.length} nodes, ${graphCache.edges.length} edges`
    );
  }
  return graphCache;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /api/graph — return the full graph
app.get('/api/graph', (_req, res) => {
  try {
    const graph = getGraph();
    res.json(graph);
  } catch (err) {
    console.error('[/api/graph] Error:', err.message);
    res.status(500).json({ error: 'Failed to load graph data' });
  }
});

// GET /api/graph/stats — summary statistics
app.get('/api/graph/stats', (_req, res) => {
  try {
    const graph = getGraph();

    const nodesByType = {};
    for (const node of graph.nodes) {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    }

    const edgesByType = {};
    for (const edge of graph.edges) {
      const label = edge.relationship || edge.label || edge.type || 'unknown';
      edgesByType[label] = (edgesByType[label] || 0) + 1;
    }

    res.json({
      totalNodes: graph.nodes.length,
      totalEdges: graph.edges.length,
      nodesByType,
      edgesByType,
    });
  } catch (err) {
    console.error('[/api/graph/stats] Error:', err.message);
    res.status(500).json({ error: 'Failed to compute graph stats' });
  }
});

// GET /api/graph/node/:nodeId — single node + neighbors
app.get('/api/graph/node/:nodeId', (req, res) => {
  try {
    const graph = getGraph();
    const nodeId = req.params.nodeId;

    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) {
      return res.status(404).json({ error: `Node '${nodeId}' not found` });
    }

    // Find edges where this node is source or target
    const connectedEdges = graph.edges.filter(
      (e) => e.source === nodeId || e.target === nodeId
    );

    // Collect neighbor node IDs
    const neighborIds = new Set();
    for (const e of connectedEdges) {
      if (e.source === nodeId) neighborIds.add(e.target);
      if (e.target === nodeId) neighborIds.add(e.source);
    }

    const neighborNodes = graph.nodes.filter((n) => neighborIds.has(n.id));

    res.json({
      node,
      neighbors: {
        nodes: neighborNodes,
        edges: connectedEdges,
      },
    });
  } catch (err) {
    console.error('[/api/graph/node] Error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve node data' });
  }
});

// POST /api/chat — chat with the LLM module
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Request body must include a "message" string' });
    }

    const result = await processQuery(message);
    res.json(result);
  } catch (err) {
    console.error('[/api/chat] Error:', err.message);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// GET /api/schema — database schema information
app.get('/api/schema', (_req, res) => {
  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all();

    const result = tables.map((t) => {
      const columns = db.prepare(`PRAGMA table_info("${t.name}")`).all();
      return {
        name: t.name,
        columns: columns.map((c) => ({ name: c.name, type: c.type })),
      };
    });

    res.json({ tables: result });
  } catch (err) {
    console.error('[/api/schema] Error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve schema information' });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
