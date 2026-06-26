import { useEffect, useState, useCallback } from "react";

const KEY_VIEWED = "shopsphere.activity.viewed.v1";
const KEY_WISHLIST = "shopsphere.activity.wishlist.v1";
const KEY_SEARCHES = "shopsphere.activity.searches.v1";
const KEY_PURCHASES = "shopsphere.activity.purchases.v1";

export type ViewedItem = { id: string; name: string; category?: string; ts: number };

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("shopsphere:activity", { detail: { key } }));
  } catch {
    /* noop */
  }
}

function useStored<T>(key: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(fallback);
  useEffect(() => {
    setVal(read(key, fallback));
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { key: string } | undefined;
      if (detail?.key === key) setVal(read(key, fallback));
    };
    window.addEventListener("shopsphere:activity", onChange);
    return () => window.removeEventListener("shopsphere:activity", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setVal((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        write(key, next);
        return next;
      });
    },
    [key],
  );
  return [val, set];
}

export function useRecentlyViewed() {
  const [items, setItems] = useStored<ViewedItem[]>(KEY_VIEWED, []);
  const record = useCallback(
    (item: Omit<ViewedItem, "ts">) => {
      setItems((prev) => {
        const filtered = prev.filter((p) => p.id !== item.id);
        return [{ ...item, ts: Date.now() }, ...filtered].slice(0, 20);
      });
    },
    [setItems],
  );
  return { viewed: items, record };
}

export function useWishlist() {
  const [ids, setIds] = useStored<string[]>(KEY_WISHLIST, []);
  const toggle = useCallback(
    (id: string) =>
      setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev].slice(0, 50))),
    [setIds],
  );
  return { wishlist: ids, toggle, has: (id: string) => ids.includes(id) };
}

export function useSearchHistory() {
  const [history, setHistory] = useStored<string[]>(KEY_SEARCHES, []);
  const record = useCallback(
    (q: string) => {
      const v = q.trim();
      if (!v) return;
      setHistory((prev) => [v, ...prev.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 8));
    },
    [setHistory],
  );
  const clear = useCallback(() => setHistory([]), [setHistory]);
  return { history, record, clear };
}

export function usePurchases() {
  const [ids, setIds] = useStored<string[]>(KEY_PURCHASES, []);
  const record = useCallback(
    (productIds: string[]) => setIds((prev) => [...productIds, ...prev].slice(0, 50)),
    [setIds],
  );
  return { purchases: ids, record };
}

export function getActivitySnapshot() {
  return {
    recentlyViewed: read<ViewedItem[]>(KEY_VIEWED, []),
    wishlist: read<string[]>(KEY_WISHLIST, []),
    searches: read<string[]>(KEY_SEARCHES, []),
    purchases: read<string[]>(KEY_PURCHASES, []),
  };
}

// Trending: static curated keywords. Replace with analytics later.
export const TRENDING_QUERIES = [
  "wireless headphones",
  "running shoes",
  "smartwatch",
  "laptop under $1500",
  "backpack",
  "sunglasses",
];