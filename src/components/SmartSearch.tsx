import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FiSearch, FiMic, FiClock, FiTrendingUp, FiCpu, FiX } from "react-icons/fi";
import { PRODUCTS } from "@/lib/products";
import { TRENDING_QUERIES, useSearchHistory } from "@/lib/user-activity";
import { useSpeechRecognition } from "@/lib/speech";
import { openShopAssistant } from "@/components/AIChat";

// Tiny Levenshtein for fuzzy fallback
function lev(a: string, b: string) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = new Array(n + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

type Suggestion = { label: string; sub?: string; type: "product" | "history" | "trending" | "ai" };

export function SmartSearch({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { history, record, clear } = useSearchHistory();

  const speech = useSpeechRecognition({
    onFinal: (text) => {
      setValue(text);
      submit(text);
    },
  });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = value.trim().toLowerCase();
    const out: Suggestion[] = [];

    if (q) {
      // product matches: substring first, then fuzzy
      const exact: Suggestion[] = [];
      const fuzzy: Suggestion[] = [];
      for (const p of PRODUCTS) {
        const hay = `${p.name} ${p.brand} ${p.category}`.toLowerCase();
        if (hay.includes(q)) {
          exact.push({ label: p.name, sub: `${p.brand} · ${p.category}`, type: "product" });
        } else {
          const tokens = hay.split(/\s+/);
          const minD = Math.min(...tokens.map((t) => lev(t, q)));
          if (minD > 0 && minD <= Math.max(1, Math.floor(q.length / 4))) {
            fuzzy.push({ label: p.name, sub: `Did you mean? ${p.brand}`, type: "product" });
          }
        }
      }
      out.push(...exact.slice(0, 4));
      if (exact.length < 4) out.push(...fuzzy.slice(0, 4 - exact.length));
      out.push({ label: `Ask AI: "${value.trim()}"`, sub: "Smart natural-language search", type: "ai" });
    } else {
      history.slice(0, 4).forEach((h) => out.push({ label: h, type: "history" }));
      TRENDING_QUERIES.slice(0, 5).forEach((t) => out.push({ label: t, type: "trending" }));
    }
    return out.slice(0, 8);
  }, [value, history]);

  useEffect(() => setActiveIdx(0), [suggestions.length, open]);

  function submit(q: string) {
    const v = q.trim();
    if (!v) return;
    record(v);
    setOpen(false);
    navigate({ to: "/products", search: { q: v } });
  }

  function choose(s: Suggestion) {
    if (s.type === "ai") {
      record(value.trim());
      setOpen(false);
      openShopAssistant(value.trim());
      return;
    }
    setValue(s.label);
    submit(s.label);
  }

  return (
    <div ref={wrapRef} className={"relative " + (compact ? "w-full max-w-xs" : "w-full max-w-md")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="glass flex items-center gap-2 rounded-full px-3.5 py-2"
      >
        <FiSearch className="text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => Math.min(suggestions.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter" && suggestions[activeIdx]) {
              e.preventDefault();
              choose(suggestions[activeIdx]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Search products or ask anything…"
          className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => setValue("")}
            className="text-muted-foreground hover:text-foreground"
          >
            <FiX className="h-3.5 w-3.5" />
          </button>
        )}
        {speech.supported && (
          <button
            type="button"
            aria-label="Voice search"
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
            className={
              "grid h-7 w-7 place-items-center rounded-full transition " +
              (speech.listening
                ? "bg-destructive/20 text-destructive animate-pulse"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            <FiMic className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur-xl">
          {!value && history.length > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Recent</span>
              <button onClick={clear} className="text-muted-foreground hover:text-foreground">Clear</button>
            </div>
          )}
          {suggestions.map((s, i) => {
            const Icon =
              s.type === "history" ? FiClock :
              s.type === "trending" ? FiTrendingUp :
              s.type === "ai" ? FiCpu :
              FiSearch;
            return (
              <button
                key={`${s.type}-${s.label}-${i}`}
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => choose(s)}
                className={
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition " +
                  (i === activeIdx ? "bg-muted/60" : "hover:bg-muted/40")
                }
              >
                <Icon className={"h-3.5 w-3.5 shrink-0 " + (s.type === "ai" ? "text-primary" : "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-foreground">{s.label}</div>
                  {s.sub && <div className="truncate text-[11px] text-muted-foreground">{s.sub}</div>}
                </div>
              </button>
            );
          })}
          {speech.listening && (
            <div className="border-t border-border px-3 py-2 text-xs text-primary">
              🎙 Listening… {speech.transcript}
            </div>
          )}
        </div>
      )}
    </div>
  );
}