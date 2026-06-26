import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — ShopSphere" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate({ to: "/admin" });
  }, [user, navigate]);

  function friendlyAuthError(err: unknown, ctx: "login" | "signup"): string {
    const raw = err instanceof Error ? err.message : String(err ?? "");
    const lower = raw.toLowerCase();
    if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network request"))
      return "Can't reach the server. Check your connection and try again.";
    if (lower.includes("invalid login") || lower.includes("invalid credentials") || lower.includes("invalid_grant"))
      return "Incorrect email or password. Please try again.";
    if (lower.includes("email not confirmed"))
      return "Please confirm your email address before signing in.";
    if (lower.includes("user is banned") || lower.includes("banned"))
      return "This account has been blocked. Contact support for help.";
    if (lower.includes("too many requests") || lower.includes("rate limit"))
      return "Too many attempts. Please wait a minute and try again.";
    if (lower.includes("user already registered") || lower.includes("already been registered"))
      return "An account with this email already exists. Try signing in instead.";
    if (lower.includes("password") && lower.includes("short"))
      return "Password is too short. Use at least 6 characters.";
    if (lower.startsWith("5") || lower.includes("server error") || lower.includes("internal"))
      return "Server error. Please try again in a moment.";
    return ctx === "login" ? `Sign-in failed: ${raw}` : `Sign-up failed: ${raw}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(normalizedEmail)) {
      setError("Please enter a valid email address (e.g. you@example.com).");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: window.location.origin, data: { name } },
        });
        if (error) throw error;
        toast.success("Account created — you're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
      navigate({ to: "/admin" });
    } catch (err) {
      const msg = friendlyAuthError(err, mode);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setError("Google sign-in failed. Please try again.");
      toast.error("Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/admin" });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full glass rounded-2xl border border-white/10 p-8"
      >
        <h1 className="font-display text-2xl font-bold tracking-tight text-gradient">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login" ? "Sign in to manage your ShopSphere store." : "Join ShopSphere in seconds."}
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium hover:bg-white/10 transition disabled:opacity-50"
        >
          <FcGoogle className="h-5 w-5" /> Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <div className="h-px flex-1 bg-white/10" />or<div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            >
              {error}
            </div>
          )}
          {mode === "signup" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-white/30"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-white/30"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-white/30"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[image:var(--gradient-brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] hover:opacity-95 transition disabled:opacity-50"
          >
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "login" ? "New to ShopSphere?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="text-foreground underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Create one" : "Sign in"}
          </button>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Back to store</Link>
        </div>
      </motion.div>
    </div>
  );
}