import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const sections = [
  {
    title: "Why Not Neo4j?",
    content: `Neo4j is the default choice when someone says "graph" — but defaults aren't always right. Our dataset has ~21,000 records across 19 tables with well-defined foreign key relationships. At this scale, Neo4j introduces operational complexity (Docker, authentication, Cypher query language, separate server process) without any performance benefit. SQLite handles our entire dataset in a single 2MB file, queries execute in under 1ms, and deployment means copying one file. More importantly, LLMs are significantly better at generating SQL than Cypher — years of training data on SQL means higher accuracy on first-try query generation, which directly impacts the user experience. The "graph" in our system is a visualization concern, not a storage concern. We construct the graph JSON from relational joins at build time and serve it as a static asset. The data lives in SQLite where it's most queryable; the graph lives in the browser where it's most visual.`,
  },
  {
    title: "Why Not Vector Embeddings?",
    content: `Vectorization solves semantic similarity search — "find me documents similar to X." Our queries are analytical: "which products have the most billing documents," "trace the flow of billing document 91150187," "find orders that were delivered but not billed." These are aggregations, joins, and filters — exactly what SQL was built for. Embedding 21,000 structured records into a vector space and then doing approximate nearest-neighbor search would be slower, less accurate, and fundamentally the wrong abstraction. You'd convert precise relational queries into fuzzy similarity matches. The only scenario where vectors would help is if we had thousands of free-text product descriptions and needed fuzzy search — we have 69 products with clean structured fields. Every query in this system maps to a deterministic SQL statement, not a similarity score.`,
  },
  {
    title: "Why Natural Language → SQL?",
    content: `The pipeline is simple: user asks a question → Gemini generates a SQL SELECT → we validate and execute it → Gemini formats the result as natural language. This works because: (1) the schema is small enough to fit entirely in the LLM's context window, (2) SQL is the most well-represented query language in LLM training data, (3) we can deterministically validate the output before execution (parse the AST, whitelist tables, enforce SELECT-only), and (4) the results are always grounded in real data — the LLM never makes up numbers, it only describes what the query returned.`,
  },
  {
    title: "4-Layer Guardrail System",
    content: `A system prompt alone isn't sufficient to prevent off-topic responses. We use four layers of defense: Layer 1 — Gemini function calling forces the LLM to choose between query_database(sql) and reject_query(reason), structurally preventing free-form answers. Layer 2 — Deterministic SQL validation parses the AST, enforces SELECT-only, whitelists tables, and requires a FROM clause (catching tricks like SELECT 'Paris'). Layer 3 — Read-only SQLite execution with a physically immutable database connection. Layer 4 — Response formatting only receives query results, not world knowledge. Even if Layer 1 is fooled, Layers 2-3 are pure code that can't be prompt-injected.`,
  },
];

const comparisons = [
  { factor: "Setup complexity", sqlite: "Zero — single file", neo4j: "Docker, config, auth", vector: "Embedding model + vector DB" },
  { factor: "Query language", sqlite: "SQL (LLMs excel at this)", neo4j: "Cypher (less LLM training data)", vector: "Similarity search (wrong paradigm)" },
  { factor: "Our dataset size", sqlite: "21K rows — trivial", neo4j: "Built for millions+", vector: "Overkill for structured data" },
  { factor: "Query accuracy", sqlite: "Deterministic, exact", neo4j: "Deterministic, exact", vector: "Approximate, probabilistic" },
  { factor: "Deployment", sqlite: "Copy one file", neo4j: "Dedicated server", vector: "Separate service + embeddings" },
  { factor: "Graph visualization", sqlite: "Built at ingestion, served as JSON", neo4j: "Native but over-engineered", vector: "Not applicable" },
];

export default function Tradeoffs() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Graph
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-lg font-semibold">Architecture Tradeoffs</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 space-y-12">
        <section>
          <p className="text-zinc-400 leading-relaxed text-sm">
            This page documents the key architectural decisions behind this system — why we chose
            SQLite over Neo4j, why we skipped vector embeddings, and how the guardrail system works.
          </p>
        </section>

        {/* Comparison Table */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-zinc-200">At a Glance</h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Factor</th>
                  <th className="px-4 py-3 text-left font-medium text-emerald-400">SQLite (our choice)</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Neo4j</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Vector DB</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                    <td className="px-4 py-3 font-medium text-zinc-300">{row.factor}</td>
                    <td className="px-4 py-3 text-emerald-300">{row.sqlite}</td>
                    <td className="px-4 py-3 text-zinc-500">{row.neo4j}</td>
                    <td className="px-4 py-3 text-zinc-500">{row.vector}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Detailed Sections */}
        {sections.map((section, i) => (
          <section key={i}>
            <h2 className="text-lg font-semibold mb-3 text-zinc-200">{section.title}</h2>
            <p className="text-zinc-400 leading-relaxed text-sm">{section.content}</p>
          </section>
        ))}

        {/* Architecture Diagram */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-zinc-200">Query Pipeline</h2>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 font-mono text-xs text-zinc-400 space-y-2">
            <div className="text-zinc-200">User Question</div>
            <div className="pl-4">↓</div>
            <div className="pl-4 text-blue-400">Layer 1: Gemini Function Calling</div>
            <div className="pl-8">→ reject_query() → <span className="text-red-400">"This system only answers O2C questions"</span></div>
            <div className="pl-8">→ query_database(sql)</div>
            <div className="pl-12">↓</div>
            <div className="pl-8 text-yellow-400">Layer 2: SQL AST Validation</div>
            <div className="pl-12">SELECT only? Known tables? FROM clause? →{" "}
              <span className="text-red-400">reject if invalid</span>
            </div>
            <div className="pl-12">↓</div>
            <div className="pl-8 text-emerald-400">Layer 3: Read-Only SQLite Execution</div>
            <div className="pl-12">↓</div>
            <div className="pl-8 text-purple-400">Layer 4: Gemini Response Formatting</div>
            <div className="pl-12">↓</div>
            <div className="pl-4 text-zinc-200">Natural Language Answer (grounded in data)</div>
          </div>
        </section>
      </main>
    </div>
  );
}
