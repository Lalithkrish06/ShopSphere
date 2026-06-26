import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { FiLock, FiArrowRight } from "react-icons/fi";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";

export const Route = createFileRoute("/checkout/")({
  head: () => ({ meta: [{ title: "Checkout — ShopSphere" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { detailed, subtotal, count, clear } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const shipping = subtotal === 0 ? 0 : subtotal >= 75 ? 0 : 9.99;
  const tax = +(subtotal * 0.08).toFixed(2);
  const total = subtotal + shipping + tax;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (count === 0) return;
    setSubmitting(true);
    setTimeout(() => {
      clear();
      navigate({ to: "/checkout/success" });
    }, 900);
  }

  if (count === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Nothing to check out</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add something to your cart first.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-bold sm:text-5xl">Checkout</h1>
      <p className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
        <FiLock /> Encrypted, secure checkout
      </p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Section title="Contact">
            <Field label="Email" name="email" type="email" placeholder="you@example.com" required />
            <Field label="Phone" name="phone" type="tel" placeholder="+1 555 000 0000" required />
          </Section>

          <Section title="Shipping address">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" name="name" required />
              <Field label="Country" name="country" defaultValue="United States" required />
            </div>
            <Field label="Address" name="address" required />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="City" name="city" required />
              <Field label="State" name="state" required />
              <Field label="Postal code" name="postal" required />
            </div>
          </Section>

          <Section title="Payment">
            <Field label="Card number" name="card" placeholder="4242 4242 4242 4242" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Expiry" name="exp" placeholder="MM/YY" required />
              <Field label="CVC" name="cvc" placeholder="123" required />
            </div>
            <p className="text-xs text-muted-foreground">
              Demo checkout — no card will be charged. Stripe can be wired up next.
            </p>
          </Section>
        </motion.div>

        <aside className="glass h-fit rounded-3xl p-6">
          <h2 className="font-display text-xl font-semibold">Order summary</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {detailed.map((l) => (
              <li key={l.productId} className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-lg bg-[oklch(0.18_0.04_268)]">
                  <img
                    src={l.product.image}
                    alt={l.product.name}
                    width={100}
                    height={100}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-medium">{l.product.name}</div>
                  <div className="text-xs text-muted-foreground">Qty {l.qty}</div>
                </div>
                <div className="text-sm font-semibold">{formatPrice(l.lineTotal)}</div>
              </li>
            ))}
          </ul>
          <div className="my-4 h-px bg-white/10" />
          <dl className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatPrice(subtotal)} />
            <Row label="Shipping" value={shipping === 0 ? "Free" : formatPrice(shipping)} />
            <Row label="Tax (est.)" value={formatPrice(tax)} />
          </dl>
          <div className="my-4 h-px bg-white/10" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-display text-2xl font-bold">{formatPrice(total)}</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-hero mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-70"
          >
            {submitting ? "Processing…" : (<>Pay {formatPrice(total)} <FiArrowRight /></>)}
          </button>
        </aside>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-3xl p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        name={name}
        type={type}
        {...rest}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[color:var(--violet)] focus:bg-white/10"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}