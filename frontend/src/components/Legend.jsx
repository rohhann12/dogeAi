const NODE_TYPES = [
  { type: "Customer", color: "#F97316" },
  { type: "SalesOrder", color: "#3B82F6" },
  { type: "SalesOrderItem", color: "#93C5FD" },
  { type: "Delivery", color: "#10B981" },
  { type: "DeliveryItem", color: "#6EE7B7" },
  { type: "BillingDocument", color: "#F59E0B" },
  { type: "BillingDocumentItem", color: "#FCD34D" },
  { type: "JournalEntry", color: "#8B5CF6" },
  { type: "Payment", color: "#EF4444" },
  { type: "Product", color: "#14B8A6" },
  { type: "Plant", color: "#6B7280" },
];

export default function Legend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 backdrop-blur-sm">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        Node Types
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {NODE_TYPES.map((n) => (
          <div key={n.type} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: n.color }}
            />
            <span className="text-[11px] text-zinc-400">{n.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
