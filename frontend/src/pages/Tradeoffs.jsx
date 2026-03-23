import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const sections = [
  {
    title: "Why Not Neo4j?",
    content: `21K rows in 19 tables with clear foreign keys — SQLite handles this in a 2MB file with sub-millisecond queries. Neo4j adds Docker, Cypher, and a separate server for zero performance gain. LLMs generate far better SQL than Cypher, so we get more accurate queries out of the box.`,
  },
  {
    title: "Why Not Vector Embeddings?",
    content: `Our queries are aggregations, joins, and filters — not similarity searches. Vectorizing structured data to do approximate nearest-neighbor lookups is the wrong abstraction when every question maps cleanly to a deterministic SQL statement.`,
  },
  {
    title: "Why Natural Language → SQL?",
    content: `The schema fits in the LLM context window, SQL is the best-represented query language in training data, and we can validate the output deterministically before execution. The LLM never makes up numbers — it only describes what the query returned.`,
  },
  {
    title: "4-Layer Guardrail System",
    content: `Function calling forces the LLM to pick query_database() or reject_query() — no free-form answers. SQL AST validation whitelists tables and enforces SELECT-only. Read-only SQLite makes mutation physically impossible. Even if Layer 1 is fooled, Layers 2–3 are pure code that can't be prompt-injected.`,
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
