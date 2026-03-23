import { ArrowLeft, GitBranch, Cpu, Zap, Brain, Terminal, Layers, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const timeline = [
  {
    time: "0:00",
    phase: "Understanding the Problem",
    icon: Brain,
    color: "#8B5CF6",
    description: "Read through the assignment. Studied the sample interface. Identified the core requirement: graph visualization + NL-to-SQL chat, not a generic chatbot.",
    tools: ["Wispr Flow (voice-to-text for rapid ideation)"],
    insight: "Recognized early that this is a structured data problem, not a semantic search problem. That one insight shaped every downstream decision.",
  },
  {
    time: "0:10",
    phase: "Dataset Exploration",
    icon: Terminal,
    color: "#3B82F6",
    description: "Inspected all 19 JSONL entity folders. Sampled first records from each. Counted rows. Mapped every foreign key relationship by hand.",
    tools: ["Claude Code (parallel bash commands to inspect data)"],
    insight: "Traced the full O2C chain: SalesOrder → Delivery → Billing → JournalEntry → Payment. Found the exact join keys and format mismatches (zero-padded item numbers).",
  },
  {
    time: "0:25",
    phase: "Architecture Deep-Think",
    icon: Layers,
    color: "#F59E0B",
    description: "Debated Neo4j vs SQLite, vector embeddings vs SQL, Cypher vs SQL generation. Designed the 4-layer guardrail system. Mapped all 11 node types and 10 edge relationships.",
    tools: ["Claude Code (ULTRATHINK mode)", "Wispr Flow"],
    decisions: [
      { choice: "SQLite over Neo4j", why: "21K rows, LLMs generate better SQL than Cypher, zero deployment complexity" },
      { choice: "No vectorization", why: "Analytical queries (aggregations, joins) not similarity search" },
      { choice: "4-layer guardrails", why: "System prompt alone is bypassable. Function calling + SQL AST validation + read-only DB = deterministic enforcement" },
    ],
  },
  {
    time: "0:40",
    phase: "Data Ingestion + Graph Construction",
    icon: GitBranch,
    color: "#10B981",
    description: "Built the JSONL→SQLite ingestion script (19 tables, 21K rows, 15 indexes). Then built the graph constructor: queries SQLite, outputs 1223 nodes and 1861 edges as JSON.",
    tools: ["Claude Code"],
    insight: "Items (SalesOrderItem, DeliveryItem, BillingDocumentItem) are nodes, not just metadata. The join tables ARE the edges — each item row creates a relationship between two header entities.",
  },
  {
    time: "0:55",
    phase: "Parallel Agent Orchestration",
    icon: Cpu,
    color: "#EF4444",
    description: "Spawned 3 sub-agents simultaneously to build independent modules in parallel. While they worked, I prepared deployment configs and the tradeoffs page.",
    tools: ["Claude Code Orchestrator", "3 parallel code-agents"],
    agents: [
      { name: "Frontend Agent", task: "React + react-force-graph-2d + chat panel + Tailwind dark theme", duration: "~3 min" },
      { name: "LLM Agent", task: "Gemini function calling, SQL validator (AST-based), 4-layer pipeline", duration: "~2.5 min" },
      { name: "API Agent", task: "Express routes: /graph, /node/:id, /chat, /schema + error handling", duration: "~2.5 min" },
    ],
  },
  {
    time: "1:10",
    phase: "Integration + Testing",
    icon: CheckCircle2,
    color: "#14B8A6",
    description: "Wired all modules together. Then spawned 5 parallel testing agents — each tested a different dimension of the system. 25 test cases total, found and fixed 1 issue (orphan plant nodes).",
    tools: ["Claude Code (5 parallel tester-agents)"],
    tests: [
      { name: "SQL Generation", result: "5/5 PASS", detail: "Complex JOINs, aggregations, broken flow detection" },
      { name: "Guardrails", result: "5/5 PASS", detail: "Prompt injection, SQL injection, off-topic — all blocked" },
      { name: "API Errors", result: "5/5 PASS", detail: "Special chars, empty body, wrong types" },
      { name: "Graph Integrity", result: "4/5 → 5/5", detail: "Found 39 orphan plants, fixed by filtering" },
      { name: "Frontend Build", result: "5/5 PASS", detail: "Clean build, routing, proxy, Tailwind" },
    ],
  },
  {
    time: "1:25",
    phase: "Deployment",
    icon: Zap,
    color: "#F97316",
    description: "Pushed to GitHub. Launched AWS EC2 t3.micro via CLI. Configured Nginx reverse proxy with SSL (Let's Encrypt) for dodgeai.rohhann.space. One command deploys.",
    tools: ["AWS CLI", "Claude Code", "GitHub"],
    insight: "Total infrastructure: 1 EC2 instance, 1 SQLite file, 1 Nginx config. No Docker, no Kubernetes, no managed databases. Complexity proportional to the problem.",
  },
];

function TimelineStep({ step, index, isLast }) {
  const Icon = step.icon;
  return (
    <div className="relative flex gap-6">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2"
          style={{ borderColor: step.color, backgroundColor: step.color + "20" }}
        >
          <Icon className="h-5 w-5" style={{ color: step.color }} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-zinc-800" />}
      </div>

      {/* Content */}
      <div className="pb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
            T+{step.time}
          </span>
          <h3 className="text-base font-semibold text-zinc-100">{step.phase}</h3>
        </div>

        <p className="text-sm text-zinc-400 leading-relaxed mb-3">{step.description}</p>

        {/* Tools used */}
        <div className="flex flex-wrap gap-2 mb-3">
          {step.tools.map((tool, i) => (
            <span key={i} className="text-xs px-2 py-1 rounded-full bg-zinc-800/80 text-zinc-300 border border-zinc-700">
              {tool}
            </span>
          ))}
        </div>

        {/* Insight callout */}
        {step.insight && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300 mb-3">
            <span className="text-zinc-500 font-medium">Key insight: </span>
            {step.insight}
          </div>
        )}

        {/* Architecture decisions */}
        {step.decisions && (
          <div className="space-y-2 mb-3">
            {step.decisions.map((d, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="shrink-0 text-emerald-400 font-medium">{d.choice}</span>
                <span className="text-zinc-500">—</span>
                <span className="text-zinc-400">{d.why}</span>
              </div>
            ))}
          </div>
        )}

        {/* Parallel agents */}
        {step.agents && (
          <div className="grid gap-2">
            {step.agents.map((a, i) => (
              <div key={i} className="flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm">
                <Cpu className="h-3.5 w-3.5 shrink-0" style={{ color: step.color }} />
                <span className="font-medium text-zinc-200 w-32 shrink-0">{a.name}</span>
                <span className="text-zinc-500">{a.task}</span>
                <span className="ml-auto text-xs text-zinc-600">{a.duration}</span>
              </div>
            ))}
            <p className="text-xs text-zinc-600 mt-1">All 3 agents ran simultaneously — total wall time ~3 min instead of ~8 min sequential</p>
          </div>
        )}

        {/* Test results */}
        {step.tests && (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="px-3 py-2 text-left text-zinc-400 font-medium">Agent</th>
                  <th className="px-3 py-2 text-left text-zinc-400 font-medium">Result</th>
                  <th className="px-3 py-2 text-left text-zinc-400 font-medium">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {step.tests.map((t, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="px-3 py-2 text-zinc-200">{t.name}</td>
                    <td className="px-3 py-2">
                      <span className={t.result.includes("PASS") ? "text-emerald-400" : "text-yellow-400"}>
                        {t.result}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-500">{t.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Workflow() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Graph
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-lg font-semibold">Development Workflow</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Hero */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-3">How This Was Built</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-4">
            This project was built in a single session using AI-augmented development.
            The key multiplier wasn't just code generation — it was <span className="text-zinc-200">parallel orchestration</span>.
            Instead of building sequentially, independent modules were built simultaneously by specialized sub-agents,
            then tested in parallel by 5 testing agents covering 25 edge cases.
          </p>
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">3</div>
              <div className="text-zinc-500">Parallel build agents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">5</div>
              <div className="text-zinc-500">Parallel test agents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">25</div>
              <div className="text-zinc-500">Test cases covered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">~90</div>
              <div className="text-zinc-500">Minutes total</div>
            </div>
          </div>
        </section>

        {/* Tools */}
        <section className="mb-12 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Tools Used</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-zinc-200 font-medium">Claude Code (Opus)</span>
              <p className="text-zinc-500">Architecture, code generation, orchestration, testing, deployment</p>
            </div>
            <div>
              <span className="text-zinc-200 font-medium">Wispr Flow</span>
              <p className="text-zinc-500">Voice-to-text for rapid prompting and ideation</p>
            </div>
            <div>
              <span className="text-zinc-200 font-medium">Sub-Agent Orchestration</span>
              <p className="text-zinc-500">Parallel code-agents and tester-agents for concurrent workstreams</p>
            </div>
            <div>
              <span className="text-zinc-200 font-medium">AWS CLI</span>
              <p className="text-zinc-500">EC2 provisioning, Nginx, SSL — all from terminal</p>
            </div>
          </div>
        </section>

        {/* Parallelism diagram */}
        <section className="mb-12">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Parallelism Timeline</h3>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 font-mono text-xs space-y-1.5 overflow-x-auto">
            <div className="text-zinc-500 mb-2">{"// Sequential would take ~25 min. Parallel took ~5 min."}</div>
            <div className="flex items-center gap-2">
              <span className="w-28 text-zinc-500 shrink-0">T+0:55</span>
              <span className="text-zinc-400">spawn</span>
              <span className="text-blue-400">→</span>
              <div className="flex gap-1">
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Frontend Agent</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">LLM Agent</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">API Agent</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-28 text-zinc-500 shrink-0">T+0:58</span>
              <span className="text-emerald-400">✓ done</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">API Agent</span>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">LLM Agent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-28 text-zinc-500 shrink-0">T+0:59</span>
              <span className="text-emerald-400">✓ done</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Frontend Agent</span>
            </div>
            <div className="text-zinc-600 my-2">{"─".repeat(60)}</div>
            <div className="flex items-center gap-2">
              <span className="w-28 text-zinc-500 shrink-0">T+1:10</span>
              <span className="text-zinc-400">spawn</span>
              <span className="text-red-400">→</span>
              <div className="flex gap-1 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">SQL Tester</span>
                <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Guardrail Tester</span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Error Tester</span>
                <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">Graph Tester</span>
                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">Build Tester</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-28 text-zinc-500 shrink-0">T+1:15</span>
              <span className="text-emerald-400">✓ 25/25 pass</span>
              <span className="text-zinc-500">(1 issue found + fixed: orphan plant nodes)</span>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section>
          <h3 className="text-sm font-semibold text-zinc-300 mb-6">Step-by-Step Timeline</h3>
          {timeline.map((step, i) => (
            <TimelineStep key={i} step={step} index={i} isLast={i === timeline.length - 1} />
          ))}
        </section>

        {/* Philosophy */}
        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Development Philosophy</h3>
          <div className="space-y-3 text-sm text-zinc-400">
            <p><span className="text-zinc-200 font-medium">Understand before building.</span> Spent 25 minutes exploring data and designing architecture before writing any code. Every decision was intentional.</p>
            <p><span className="text-zinc-200 font-medium">Parallel over sequential.</span> Independent modules were built simultaneously by specialized agents. Testing was parallelized across 5 agents covering 25 edge cases.</p>
            <p><span className="text-zinc-200 font-medium">Complexity proportional to the problem.</span> No Neo4j for 21K rows. No vector DB for structured queries. No Docker for a single-process app. The right tool for the right scale.</p>
            <p><span className="text-zinc-200 font-medium">Defense in depth.</span> Guardrails aren't just a system prompt — they're 4 layers of increasingly deterministic validation, from LLM function calling down to SQL AST parsing.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
