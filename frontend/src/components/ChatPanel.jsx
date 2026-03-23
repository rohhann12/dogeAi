import { useState, useRef, useEffect } from "react";
import { Send, ChevronDown, ChevronRight, Bot, User } from "lucide-react";

const WELCOME_MESSAGE = {
  role: "assistant",
  content: "Hi! I can help you analyze the Order to Cash process.",
  sql: null,
  data: null,
};

export default function ChatPanel() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || "No response.",
          sql: data.sql || null,
          data: Array.isArray(data.data) ? data.data : null,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          sql: null,
          data: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      {/* Chat header */}
      <div className="flex h-12 shrink-0 items-center border-b border-zinc-800 px-4">
        <Bot className="mr-2 h-4 w-4 text-zinc-400" />
        <span className="text-sm font-semibold text-zinc-200">O2C AI</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {loading && <TypingIndicator />}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-800 p-3">
        <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the O2C process..."
            className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="rounded-md p-1 text-zinc-400 transition hover:text-zinc-200 disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-blue-600" : "bg-zinc-700"
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-white" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-zinc-300" />
        )}
      </div>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isUser ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-200"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>
        {message.sql && <SqlBlock sql={message.sql} />}
        {message.data && message.data.length > 0 && (
          <DataTable data={message.data} />
        )}
      </div>
    </div>
  );
}

function SqlBlock({ sql }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 transition hover:text-zinc-300"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        SQL Query
      </button>
      {open && (
        <pre className="mt-1 overflow-x-auto rounded bg-zinc-950 p-2 text-[11px] leading-relaxed text-emerald-400">
          {sql}
        </pre>
      )}
    </div>
  );
}

function DataTable({ data }) {
  if (!data.length) return null;
  const keys = Object.keys(data[0]);

  return (
    <div className="mt-2 overflow-x-auto rounded border border-zinc-700">
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="border-b border-zinc-700 bg-zinc-900">
            {keys.map((k) => (
              <th
                key={k}
                className="px-2 py-1 font-medium text-zinc-400"
              >
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 20).map((row, i) => (
            <tr key={i} className="border-b border-zinc-800 last:border-0">
              {keys.map((k) => (
                <td key={k} className="px-2 py-1 text-zinc-300">
                  {String(row[k] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 20 && (
        <div className="px-2 py-1 text-[10px] text-zinc-500">
          Showing 20 of {data.length} rows
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-700">
        <Bot className="h-3.5 w-3.5 text-zinc-300" />
      </div>
      <div className="rounded-lg bg-zinc-800 px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:0ms]" />
          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:150ms]" />
          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
