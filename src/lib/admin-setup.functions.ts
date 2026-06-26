import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * One-time admin bootstrap: grants the calling user the `admin` role
 * ONLY if no admin exists yet in the project. Subsequent calls are rejected.
 */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) throw new Error(countErr.message);

    if ((count ?? 0) > 0) {
      // Check whether the caller is already that admin
      const { data: mine } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (mine) return { ok: true, alreadyAdmin: true };
      throw new Error("An admin already exists for this project. Ask an existing admin to grant you access.");
    }

    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (insErr) throw new Error(insErr.message);

    return { ok: true, alreadyAdmin: false };
  });