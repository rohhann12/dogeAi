import { X, Minus } from "lucide-react";

export default function NodeDetail({ node, onClose, onMinimize, minimized }) {
  if (!node) return null;

  if (minimized) {
    return (
      <div className="absolute right-4 top-4 z-10">
        <button
          onClick={onMinimize}
          className="rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm transition hover:bg-zinc-800"
        >
          Show: {node.label}
        </button>
      </div>
    );
  }

  return (
    <div className="absolute right-4 top-4 z-10 w-72 rounded-lg border border-zinc-800 bg-zinc-900/90 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: node.color }}
          />
          <span className="text-sm font-semibold text-zinc-100">
            {node.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="rounded p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
            title="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto px-4 py-3">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Type: {node.type}
        </div>
        {node.metadata &&
          Object.entries(node.metadata).map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between border-b border-zinc-800/50 py-1.5 last:border-0"
            >
              <span className="text-xs text-zinc-500">{key}</span>
              <span className="max-w-[55%] text-right text-xs text-zinc-300">
                {String(value)}
              </span>
            </div>
          ))}
        {(!node.metadata || Object.keys(node.metadata).length === 0) && (
          <p className="text-xs text-zinc-600">No metadata available.</p>
        )}
      </div>
    </div>
  );
}
