import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Link } from "@tanstack/react-router";
import { FiMessageCircle, FiX, FiSend, FiStar, FiMic, FiImage, FiSquare } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/lib/speech";
import { getActivitySnapshot } from "@/lib/user-activity";
import { useCart } from "@/lib/cart";

type ProductHit = {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  compare_at: number | null;
  rating: number;
  reviews: number;
  stock: number;
  image_url: string | null;
  category: string | null;
  description: string | null;
};

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function ProductHitCard({ p }: { p: ProductHit }) {
  return (
    <Link
      to="/products"
      search={{ q: p.name }}
      className="group flex gap-3 rounded-xl border border-border bg-card/60 p-2.5 transition hover:border-primary/50 hover:bg-card"
    >
      {p.image_url ? (
        <img src={p.image_url} alt={p.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-lg bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">{p.brand}</div>
        <div className="truncate text-sm font-medium text-foreground group-hover:text-primary">{p.name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs">
          <span className="font-semibold text-foreground">{fmt(p.price)}</span>
          {p.compare_at && p.compare_at > p.price ? (
            <span className="text-muted-foreground line-through">{fmt(p.compare_at)}</span>
          ) : null}
          {p.rating ? (
            <span className="ml-auto inline-flex items-center gap-0.5 text-muted-foreground">
              <FiStar className="h-3 w-3 fill-current text-amber-400" /> {p.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
        </div>
      </div>
    </Link>
  );
}

function renderMessage(m: UIMessage) {
  const blocks: React.ReactNode[] = [];
  m.parts.forEach((part, i) => {
    if (part.type === "text") {
      if (part.text) blocks.push(<div key={`t-${i}`} className="whitespace-pre-wrap text-sm leading-relaxed">{part.text}</div>);
    } else if (part.type.startsWith("tool-")) {
      const tp = part as unknown as {
        type: string;
        state?: string;
        output?: { products?: ProductHit[]; error?: string };
      };
      if (tp.state === "output-available" && tp.output?.products?.length) {
        blocks.push(
          <div key={`p-${i}`} className="mt-2 flex flex-col gap-2">
            {tp.output.products.slice(0, 6).map((p) => (
              <ProductHitCard key={p.id} p={p} />
            ))}
          </div>,
        );
      } else if (tp.state !== "output-available") {
        blocks.push(
          <div key={`s-${i}`} className="mt-1 text-xs italic text-muted-foreground">Searching catalog…</div>,
        );
      }
    }
  });
  return blocks;
}

const SUGGESTIONS = [
  "Recommend wireless headphones under $300",
  "Compare the smartwatch and the headphones",
  "Show me something for running",
  "What should I buy next?",
];

export function openShopAssistant(prompt?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("shopsphere:openChat", { detail: { prompt } }));
}

export function AIChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null);
  const { items: cartItems } = useCart();
  const cartIdsRef = useRef<string[]>([]);
  cartIdsRef.current = cartItems.map((c) => c.productId);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => {
          const snap = getActivitySnapshot();
          return {
            activity: {
              recentlyViewed: snap.recentlyViewed.map(({ id, name, category }) => ({ id, name, category })),
              wishlist: snap.wishlist,
              searches: snap.searches,
              cart: cartIdsRef.current,
            },
          };
        },
      }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(
    (text: string, imageUrl?: string) => {
      const v = text.trim();
      if ((!v && !imageUrl) || status === "submitted" || status === "streaming") return;
      if (imageUrl) {
        sendMessage({
          role: "user",
          parts: [
            { type: "file", mediaType: "image/jpeg", url: imageUrl },
            { type: "text", text: v || "What is this product? Find similar items in the catalog." },
          ],
        });
      } else {
        sendMessage({ text: v });
      }
      setInput("");
      setAttachedImage(null);
    },
    [sendMessage, status],
  );

  const speech = useSpeechRecognition({
    onFinal: (text) => {
      setInput("");
      submit(text);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // External "openShopAssistant" bridge
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { prompt?: string } | undefined;
      setOpen(true);
      if (detail?.prompt) {
        setTimeout(() => submit(detail.prompt!), 200);
      }
    };
    window.addEventListener("shopsphere:openChat", handler);
    return () => window.removeEventListener("shopsphere:openChat", handler);
  }, [submit]);

  const onPickImage = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("Image must be under 4 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      if (url) setAttachedImage({ url, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring" }}
        onClick={() => setOpen((o) => !o)}
        aria-label="Open AI shopping assistant"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105"
      >
        {open ? <FiX className="h-6 w-6" /> : <FiMessageCircle className="h-6 w-6" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-5 z-50 flex h-[600px] max-h-[80vh] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/10 to-transparent px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-foreground">ShopSphere Assistant</div>
                <div className="text-[11px] text-muted-foreground">AI-powered shopping help</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-card/50 p-3 text-sm text-foreground">
                    Hi! I'm your shopping assistant. Ask me to find products, compare options, or suggest alternatives.
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => submit(s)}
                        className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-foreground transition hover:border-primary/50 hover:bg-card"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => {
                let imgUrl: string | undefined;
                if (m.role === "user") {
                  for (const p of m.parts) {
                    if (p.type === "file") {
                      const url = (p as { url?: unknown }).url;
                      if (typeof url === "string") {
                        imgUrl = url;
                        break;
                      }
                    }
                  }
                }
                return (
                <div
                  key={m.id}
                  className={
                    m.role === "user"
                      ? "ml-8 rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "mr-4 text-foreground"
                  }
                >
                  {imgUrl && (
                    <img
                      src={imgUrl}
                      alt="upload"
                      className="mb-1.5 h-28 w-28 rounded-lg object-cover"
                    />
                  )}
                  {renderMessage(m)}
                </div>
                );
              })}

              {status === "submitted" && (
                <div className="text-xs italic text-muted-foreground">Thinking…</div>
              )}
              {speech.listening && (
                <div className="text-xs text-primary">🎙 Listening… {speech.transcript}</div>
              )}
              {speech.error && (
                <div className="text-xs text-destructive">{speech.error}</div>
              )}
              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                  Something went wrong. Please try again.
                </div>
              )}
            </div>

            {attachedImage && (
              <div className="flex items-center gap-2 border-t border-border bg-card/40 px-3 py-2">
                <img src={attachedImage.url} alt="" className="h-10 w-10 rounded object-cover" />
                <span className="flex-1 truncate text-xs text-muted-foreground">{attachedImage.name}</span>
                <button
                  onClick={() => setAttachedImage(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(input, attachedImage?.url);
              }}
              className="flex items-center gap-1.5 border-t border-border bg-card/40 p-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  onPickImage(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload product image"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <FiImage className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => (speech.listening ? speech.stop() : speech.start())}
                disabled={!speech.supported}
                title={speech.supported ? "Voice search" : "Voice not supported in this browser"}
                className={
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full transition " +
                  (speech.listening
                    ? "bg-destructive/20 text-destructive animate-pulse"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40")
                }
              >
                {speech.listening ? <FiSquare className="h-4 w-4" /> : <FiMic className="h-4 w-4" />}
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={attachedImage ? "Describe what you're looking for…" : "Ask, dictate, or upload an image…"}
                className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
              />
              <Button
                type="submit"
                size="icon"
                disabled={(!input.trim() && !attachedImage) || status === "submitted" || status === "streaming"}
                className="h-9 w-9 shrink-0 rounded-full"
              >
                <FiSend className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}