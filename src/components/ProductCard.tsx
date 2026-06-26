import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FiStar, FiPlus } from "react-icons/fi";
import { formatPrice, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { add } = useCart();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: index * 0.04, ease: "easeOut" }}
      className="group relative"
    >
      <Link
        to="/products/$id"
        params={{ id: product.id }}
        className="block glass overflow-hidden rounded-3xl p-3 transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
      >
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-[oklch(0.18_0.04_268)]">
          {product.badge && (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
              {product.badge}
            </span>
          )}
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            width={800}
            height={800}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        <div className="px-2 pb-2 pt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="uppercase tracking-wider">{product.brand}</span>
            <span className="inline-flex items-center gap-1">
              <FiStar className="text-[color:var(--violet)]" /> {product.rating}
            </span>
          </div>
          <h3 className="mt-1.5 line-clamp-1 text-sm font-semibold text-foreground">
            {product.name}
          </h3>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="font-display text-lg font-bold">{formatPrice(product.price)}</div>
              {product.compareAt && (
                <div className="text-xs text-muted-foreground line-through">
                  {formatPrice(product.compareAt)}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                add(product.id);
              }}
              className="grid h-10 w-10 place-items-center rounded-full btn-hero"
              aria-label={`Add ${product.name} to cart`}
            >
              <FiPlus />
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}