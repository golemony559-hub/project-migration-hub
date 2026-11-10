import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  LayoutDashboard,
  LifeBuoy,
  LoaderCircle,
  LockKeyhole,
  Package,
  Plus,
  Receipt,
  Settings,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { MarketplaceAuthDialog } from "@/components/marketplace-auth-dialog";
import { useMarketplaceAuth } from "@/hooks/use-marketplace-auth";
import { supabase } from "@/integrations/supabase/client";
import { isCreatorOnboarded } from "@/lib/creator-status";
import { CreatorContext, type CreatorProfile } from "@/components/creator/creator-context";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Creator dashboard | Doerly" },
      { name: "description", content: "Manage your products, sales and profile on Doerly." },
      { property: "og:title", content: "Creator dashboard | Doerly" },
      { property: "og:description", content: "Manage your products, sales and profile on Doerly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardLayout,
});

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/products", label: "Products", icon: Package, exact: false },
  { to: "/dashboard/transactions", label: "Transactions", icon: Receipt, exact: false },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { to: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
  { to: "/dashboard/profile", label: "Profile", icon: UserRound, exact: false },
] as const;

function DashboardLayout() {
  const { user, ready } = useMarketplaceAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const userId = user?.id;

  const reloadProfile = useCallback(async () => {
    if (!userId) return;
    // Read the account fresh so onboarding acknowledgements are always current.
    const [{ data: fresh }, { data }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);
    setProfile(data);
    setOnboarded(Boolean(fresh.user && isCreatorOnboarded(fresh.user, data)));
    setLoaded(true);
  }, [userId]);

  useEffect(() => {
    setLoaded(false);
    void reloadProfile();
  }, [reloadProfile]);


  useEffect(() => {
    if (user && loaded && !onboarded) void navigate({ to: "/creator", replace: true });
  }, [user, loaded, onboarded, navigate]);

  if (!ready || (user && (!loaded || !onboarded))) {
    return (
      <main className="market-message">
        <LoaderCircle className="animate-spin" aria-label="Loading your dashboard" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="creator-gate">
        <div className="creator-gate-copy">
          <p className="eyebrow">Creator dashboard</p>
          <h1>Sign in to manage your products.</h1>
          <p>Add products, follow reviews and track how your know-how is doing.</p>
          <Button onClick={() => setAuthOpen(true)}>Sign in</Button>
        </div>
        <div className="creator-gate-note">
          <LockKeyhole aria-hidden="true" />
          <p>Your drafts and uploaded files stay private to your account.</p>
        </div>
        <MarketplaceAuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </main>
    );
  }

  return (
    <CreatorContext.Provider value={{ user, profile: profile!, reloadProfile }}>
      <div className="dash-shell">
        <aside className="dash-sidebar" aria-label="Creator dashboard">
          <div className="dash-sidebar-head">
            {profile?.avatar_url ? (
              <img
                className="creator-avatar creator-avatar-image"
                src={profile.avatar_url}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="creator-avatar">{profile?.display_name.charAt(0)}</span>
            )}
            <div>
              <strong>{profile?.display_name}</strong>
              <small>Creator</small>
            </div>
          </div>
          <Button asChild className="dash-new-button">
            <Link to="/dashboard/products/new">
              <Plus aria-hidden="true" /> Add new product
            </Link>
          </Button>
          <nav className="dash-nav">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                activeProps={{ className: "is-active" }}
              >
                <item.icon aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <Link to="/creator-help" className="dash-help-link">
            <LifeBuoy aria-hidden="true" />
            <span>Creator help</span>
          </Link>
        </aside>
        <div className="dash-main">
          <Outlet />
        </div>
      </div>
      <Toaster />
    </CreatorContext.Provider>
  );
}
