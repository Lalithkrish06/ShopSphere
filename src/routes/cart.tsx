import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { FiMinus, FiPlus, FiTrash2, FiArrowRight, FiShoppingBag } from "react-icons/fi";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your cart — ShopSphere" }] }),
  component: CartPage,
});

function CartPage() {
  const { detailed, subtotal, setQty, remove, count } = useCart();
  const shipping = subtotal === 0 ? 0 : subtotal >= 75 ? 0 : 9.99;
  const tax = +(subtotal * 0.08).toFixed(2);
  const total = subtotal + shipping + tax;

  if (count === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full glass">
          <FiShoppingBag className="text-2xl text-muted-foreground" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick up where you left off and add something you love.
        </p>
        <Link
          to="/products"
          className="btn-hero mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
        >
          Start shopping <FiArrowRight />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-bold sm:text-5xl">Your cart</h1>
      <p className="text-sm text-muted-foreground">
        {count} item{count === 1 ? "" : "s"} ready to ship.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {detailed.map((line) => (
              <motion.li
                key={line.productId}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="glass flex gap-4 rounded-2xl p-3 sm:p-4"
              >
                <Link
                  to="/products/$id"
                  params={{ id: line.productId }}
                  className="block h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[oklch(0.18_0.04_268)]"
                >
                  <img
                    src={line.product.image}
                    alt={line.product.name}
                    width={200}
                    height={200}
                    className="h-full w-full object-cover"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {line.product.brand}
                      </div>
                      <Link
                        to="/products/$id"
                        params={{ id: line.productId }}
                        className="line-clamp-1 text-sm font-semibold hover:text-[color:var(--violet)]"
                      >
                        {line.product.name}
                      </Link>
                    </div>
                    <button
                      onClick={() => remove(line.productId)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${line.product.name}`}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                  <div className="mt-auto flex items-end justify-between pt-3">
                    <div className="inline-flex items-center rounded-full border border-white/10">
                      <button
                        onClick={() => setQty(line.productId, line.qty - 1)}
                        className="grid h-9 w-9 place-items-center text-muted-foreground hover:text-foreground"
                        aria-label="Decrease"
                      >
                        <FiMinus />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{line.qty}</span>
                      <button
                        onClick={() => setQty(line.productId, line.qty + 1)}
                        className="grid h-9 w-9 place-items-center text-muted-foreground hover:text-foreground"
                        aria-label="Increase"
                      >
                        <FiPlus />
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg font-bold">
                        {formatPrice(line.lineTotal)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatPrice(line.product.price)} each
                      </div>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <aside className="glass h-fit rounded-3xl p-6">
          <h2 className="font-display text-xl font-semibold">Order summary</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <Row label="Subtotal" value={formatPrice(subtotal)} />
            <Row label="Shipping" value={shipping === 0 ? "Free" : formatPrice(shipping)} />
            <Row label="Tax (est.)" value={formatPrice(tax)} />
            <div className="my-3 h-px bg-white/10" />
            <Row label="Total" value={formatPrice(total)} strong />
          </dl>

          <Link
            to="/checkout"
            className="btn-hero mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
          >
            Checkout <FiArrowRight />
          </Link>
          <Link
            to="/products"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Continue shopping
          </Link>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Use code <span className="font-semibold text-foreground">WELCOME10</span> at checkout
            for 10% off your first order.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-display text-lg font-bold" : ""}>{value}</dd>
    </div>
  );
}