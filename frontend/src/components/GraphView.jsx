import { useRef, useState, useCallback, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import NodeDetail from "./NodeDetail";
import Legend from "./Legend";
import { EyeOff, Eye } from "lucide-react";

const ITEM_TYPES = new Set([
  "SalesOrderItem",
  "DeliveryItem",
  "BillingDocumentItem",
]);

const BIG_TYPES = new Set(["Customer", "SalesOrder", "BillingDocument"]);
const SMALL_TYPES = ITEM_TYPES;

function getNodeSize(type) {
  if (BIG_TYPES.has(type)) return 6;
  if (SMALL_TYPES.has(type)) return 3;
  return 4;
}

export default function GraphView({ graphData }) {
  const fgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [hideGranular, setHideGranular] = useState(false);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hasZoomedToFit, setHasZoomedToFit] = useState(false);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Zoom to fit once data loads
  useEffect(() => {
    if (hasZoomedToFit) return;
    if (graphData.nodes.length > 0 && fgRef.current) {
      const timer = setTimeout(() => {
        fgRef.current.zoomToFit(400, 60);
        setHasZoomedToFit(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [graphData, hasZoomedToFit]);

  // Filter data based on hide granular toggle
  const filteredData = useCallback(() => {
    if (!hideGranular) return graphData;
    const visibleNodes = graphData.nodes.filter(
      (n) => !ITEM_TYPES.has(n.type),
    );
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const visibleLinks = graphData.links.filter((l) => {
      const srcId = typeof l.source === "object" ? l.source.id : l.source;
      const tgtId = typeof l.target === "object" ? l.target.id : l.target;
      return visibleIds.has(srcId) && visibleIds.has(tgtId);
    });
    return { nodes: visibleNodes, links: visibleLinks };
  }, [graphData, hideGranular]);

  const handleNodeClick = useCallback(
    (node) => {
      setSelectedNode(node);
      setMinimized(false);

      // Build highlight sets
      const neighbors = new Set();
      neighbors.add(node.id);
      const linkSet = new Set();
      graphData.links.forEach((link) => {
        const srcId =
          typeof link.source === "object" ? link.source.id : link.source;
        const tgtId =
          typeof link.target === "object" ? link.target.id : link.target;
        if (srcId === node.id || tgtId === node.id) {
          neighbors.add(srcId);
          neighbors.add(tgtId);
          linkSet.add(link);
        }
      });
      setHighlightNodes(neighbors);
      setHighlightLinks(linkSet);
    },
    [graphData],
  );

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
  }, []);

  const handleNodeHover = useCallback((node) => {
    setHoveredNode(node || null);
  }, []);

  const nodeCanvasObject = useCallback(
    (node, ctx, globalScale) => {
      const size = getNodeSize(node.type);
      const isHighlighted =
        highlightNodes.size === 0 || highlightNodes.has(node.id);
      const alpha = isHighlighted ? 1 : 0.15;

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
      ctx.fillStyle = node.color || "#888";
      ctx.globalAlpha = alpha;
      ctx.fill();

      // Draw glow for highlighted nodes
      if (highlightNodes.size > 0 && highlightNodes.has(node.id)) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI, false);
        ctx.strokeStyle = node.color || "#888";
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.stroke();
      }

      // Show label when zoomed in or hovered
      const showLabel =
        globalScale > 2.5 ||
        hoveredNode?.id === node.id ||
        (highlightNodes.size > 0 && highlightNodes.has(node.id));
      if (showLabel) {
        const label = node.label || node.id;
        const fontSize = Math.max(10 / globalScale, 2);
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#e4e4e7";
        ctx.globalAlpha = alpha;
        ctx.fillText(label, node.x, node.y + size + 2);
      }

      ctx.globalAlpha = 1;
    },
    [highlightNodes, hoveredNode],
  );

  const linkCanvasObject = useCallback(
    (link, ctx, globalScale) => {
      const isHighlighted =
        highlightLinks.size === 0 || highlightLinks.has(link);
      const alpha = isHighlighted ? 0.4 : 0.05;

      const start = link.source;
      const end = link.target;
      if (!start || !end || start.x == null || end.x == null) return;

      // Draw line
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Draw arrow
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return;

      const targetSize = getNodeSize(end.type || "");
      const arrowLen = 4;
      const arrowPos = 1 - (targetSize + 2) / len;
      const ax = start.x + dx * arrowPos;
      const ay = start.y + dy * arrowPos;
      const angle = Math.atan2(dy, dx);

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - arrowLen * Math.cos(angle - Math.PI / 6),
        ay - arrowLen * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        ax - arrowLen * Math.cos(angle + Math.PI / 6),
        ay - arrowLen * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();

      // Show relationship label on hover when link is highlighted
      if (highlightLinks.has(link) && link.relationship && globalScale > 1.5) {
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const fontSize = Math.max(8 / globalScale, 1.5);
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(161,161,170,0.7)";
        ctx.fillText(link.relationship, midX, midY);
      }
    },
    [highlightLinks],
  );

  const data = filteredData();

  return (
    <div ref={containerRef} className="relative h-full w-full bg-[#0a0a0a]">
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={data}
        nodeId="id"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={(node, color, ctx) => {
          const size = getNodeSize(node.type);
          ctx.beginPath();
          ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI, false);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        linkCanvasObject={linkCanvasObject}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={handleBackgroundClick}
        backgroundColor="#0a0a0a"
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        cooldownTicks={100}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />

      {/* Controls */}
      <div className="absolute left-4 top-4 z-10 flex gap-2">
        <button
          onClick={() => setHideGranular((p) => !p)}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm transition hover:bg-zinc-800"
        >
          {hideGranular ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
          {hideGranular ? "Show Granular" : "Hide Granular"}
        </button>
      </div>

      {/* Node detail panel */}
      <NodeDetail
        node={selectedNode}
        onClose={() => {
          setSelectedNode(null);
          setHighlightNodes(new Set());
          setHighlightLinks(new Set());
        }}
        onMinimize={() => setMinimized((p) => !p)}
        minimized={minimized}
      />

      {/* Legend */}
      <Legend />
    </div>
  );
}
