import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isCreatorOnboarded } from "./creator-status";
import { roleLabels, type RoleLabel } from "./user-roles";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  roles: RoleLabel[];
  products: number;
  joinedAt: string;
  lastSignInAt: string | null;
  confirmed: boolean;
};

/** Admin-only list of every account with its roles. */
export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRow[]> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admins only.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const users: Awaited<ReturnType<typeof supabaseAdmin.auth.admin.listUsers>>["data"]["users"] =
      [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error("Could not load users.");
      users.push(...data.users);
      if (data.users.length < 1000) break;
    }

    const [{ data: roles }, { data: profiles }, { data: guides }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("profiles").select("id, display_name, bio"),
      supabaseAdmin.from("guides").select("creator_id"),
    ]);
    const rolesBy = new Map<string, string[]>();
    for (const r of roles ?? []) rolesBy.set(r.user_id, [...(rolesBy.get(r.user_id) ?? []), r.role]);
    const profileBy = new Map((profiles ?? []).map((p) => [p.id, p]));
    const productsBy = new Map<string, number>();
    for (const g of guides ?? []) productsBy.set(g.creator_id, (productsBy.get(g.creator_id) ?? 0) + 1);

    return users
      .map((u) => {
        const profile = profileBy.get(u.id) ?? null;
        const products = productsBy.get(u.id) ?? 0;
        return {
          id: u.id,
          email: u.email ?? "",
          name: profile?.display_name ?? "",
          roles: roleLabels({
            grantedRoles: rolesBy.get(u.id) ?? [],
            isCreator: products > 0 || isCreatorOnboarded(u, profile),
          }),
          products,
          joinedAt: u.created_at,
          lastSignInAt: u.last_sign_in_at ?? null,
          confirmed: Boolean(u.email_confirmed_at),
        };
      })
      .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
  });
