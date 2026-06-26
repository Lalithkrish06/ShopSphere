import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FiShoppingBag, FiUser, FiGrid } from "react-icons/fi";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { SmartSearch } from "@/components/SmartSearch";

export function Header() {
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-brand)] shadow-[var(--shadow-glow)]">
            <span className="font-display text-lg font-bold text-white">S</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-base font-bold tracking-tight">ShopSphere</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Smart Shopping
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition">
            Home
          </Link>
          <Link to="/products" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition">
            Shop
          </Link>
          <a href="#categories" className="hover:text-foreground transition">Categories</a>
          {isAdmin && (
            <Link to="/admin" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition inline-flex items-center gap-1.5">
              <FiGrid className="h-3.5 w-3.5" /> Admin
            </Link>
          )}
        </nav>

        <div className="hidden flex-1 justify-center px-6 md:flex">
          <SmartSearch />
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={user ? "/admin" : "/auth"}
            className="hidden h-10 w-10 place-items-center rounded-full border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/30 transition sm:grid"
            aria-label="Account"
          >
            <FiUser />
          </Link>
          <Link
            to="/cart"
            className="relative inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm hover:border-white/30 transition"
          >
            <FiShoppingBag />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="grid h-5 min-w-5 place-items-center rounded-full bg-[image:var(--gradient-brand)] px-1.5 text-xs font-semibold text-white"
              >
                {count}
              </motion.span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
        <div>© {new Date().getFullYear()} ShopSphere. Smart shopping, seamless experience.</div>
        <div className="flex gap-5">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
          <a href="#" className="hover:text-foreground">Contact</a>
        </div>
      </div>
    </footer>
  );
}