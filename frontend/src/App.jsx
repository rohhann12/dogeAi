import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import GraphView from "./components/GraphView";
import ChatPanel from "./components/ChatPanel";
import Tradeoffs from "./pages/Tradeoffs";
import Workflow from "./pages/Workflow";
import { ChevronRight, FileText, GitBranch } from "lucide-react";

function MainView() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/graph")
      .then((res) => res.json())
      .then((data) => {
        const links = (data.edges || []).map((e) => ({
          source: e.source,
          target: e.target,
          relationship: e.relationship,
          metadata: e.metadata,
        }));
        setGraphData({ nodes: data.nodes || [], links });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch graph data:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-5">
        <div className="flex items-center">
          <span className="text-sm font-medium text-zinc-400">Mapping</span>
          <ChevronRight className="mx-2 h-3.5 w-3.5 text-zinc-600" />
          <span className="text-sm font-semibold text-zinc-100">
            Order to Cash
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/workflow"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Dev Workflow
          </Link>
          <Link
            to="/tradeoffs"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            Architecture Tradeoffs
          </Link>
        </div>
      </header>

      {/* Main content */}
      <div className="flex min-h-0 flex-1">
        {/* Left panel - Graph */}
        <div className="relative w-[70%] border-r border-zinc-800">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-sm text-zinc-500">Loading graph...</div>
            </div>
          ) : (
            <GraphView graphData={graphData} />
          )}
        </div>

        {/* Right panel - Chat */}
        <div className="w-[30%]">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainView />} />
        <Route path="/tradeoffs" element={<Tradeoffs />} />
        <Route path="/workflow" element={<Workflow />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
