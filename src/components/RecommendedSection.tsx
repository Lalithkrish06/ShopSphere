import { useMemo } from "react";
import { motion } from "framer-motion";
import { FiClock, FiHeart, FiZap } from "react-icons/fi";
import { Link } from "@tanstack/react-router";
import { PRODUCTS } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { useRecentlyViewed, useWishlist } from "@/lib/user-activity";
import { openShopAssistant } from "@/components/AIChat";

export function RecommendedSection() {
  const { viewed } = useRecentlyViewed();
  const { wishlist } = useWishlist();

  const { recommended, recentlyViewedItems } = useMemo(() => {
    const viewedIds = new Set(viewed.map((v) => v.id));
    const viewedCats = new Set(viewed.map((v) => v.category).filter(Boolean));
    const wishlistCats = new Set(
      wishlist
        .map((id) => PRODUCTS.find((p) => p.id === id)?.category)
        .filter(Boolean) as string[],
    );
    const allCats = new Set([...viewedCats, ...wishlistCats]);

    let recs = PRODUCTS.filter((p) => !viewedIds.has(p.id));
    if (allCats.size) {
      const inCat = recs.filter((p) => allCats.has(p.category));
      recs = inCat.length >= 4 ? inCat : [...inCat, ...recs.filter((p) => !inCat.includes(p))];
    }
    recs.sort((a, b) => b.rating - a.rating);
    return {
      recommended: recs.slice(0, 4),
      recentlyViewedItems: viewed
        .map((v) => PRODUCTS.find((p) => p.id === v.id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .slice(0, 4),
    };
  }, [viewed, wishlist]);

  if (recommended.length === 0 && recentlyViewedItems.length === 0) return null;

  const basis =
    viewed.length || wishlist.length
      ? `Based on ${viewed.length} viewed${wishlist.length ? ` · ${wishlist.length} wishlisted` : ""}`
      : "Popular picks while you browse";

  return (
    <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex items-end justify-between"
      >
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-[color:var(--violet)]">
            <FiZap className="h-3 w-3" /> AI-picked
          </span>
          <h2 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Recommended for you</h2>
          <p className="mt-1 text-xs text-muted-foreground">{basis}</p>
        </div>
        <button
          onClick={() => openShopAssistant("Recommend something for me based on what I've been looking at.")}
          className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
        >
          Ask AI →
        </button>
      </motion.div>

      {recommended.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
          {recommended.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}

      {recentlyViewedItems.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <FiClock className="h-3 w-3" /> Recently viewed
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {recentlyViewedItems.map((p) => (
              <Link
                key={p.id}
                to="/products/$id"
                params={{ id: p.id }}
                className="glass group flex w-48 shrink-0 flex-col overflow-hidden rounded-2xl"
              >
                <img src={p.image} alt={p.name} className="aspect-square w-full object-cover" />
                <div className="p-3">
                  <div className="truncate text-xs uppercase tracking-wide text-muted-foreground">{p.brand}</div>
                  <div className="truncate text-sm font-medium group-hover:text-primary">{p.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {wishlist.length > 0 && (
        <div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
          <FiHeart className="h-3 w-3 text-pink-400" /> {wishlist.length} item{wishlist.length === 1 ? "" : "s"} in your wishlist
        </div>
      )}
    </section>
  );
}