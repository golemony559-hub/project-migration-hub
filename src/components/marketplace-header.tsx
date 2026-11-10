import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketplaceAuthDialog } from "@/components/marketplace-auth-dialog";
import { useMarketplaceAuth } from "@/hooks/use-marketplace-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/doerly-logo.png.asset.json";

export function MarketplaceHeader() {
  const { user } = useMarketplaceAuth();
  const { isAdmin } = useIsAdmin();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    setMenuOpen(false);
    await navigate({ to: "/" });
  }

  return (
    <>
      <header className="market-header">
        <div className="market-header-inner">
          <Link to="/" className="market-brand" aria-label="Doerly home">
            <img className="market-brand-mark" src={logoAsset.url} alt="" aria-hidden="true" />
            <span>Doerly</span>
          </Link>
          <nav className={`market-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
            <Link to="/explore" search={{}} onClick={() => setMenuOpen(false)}>
              Explore
            </Link>
            <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
              Creator dashboard
            </Link>
            {user && (
              <Link to="/library" onClick={() => setMenuOpen(false)}>
                My library
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" onClick={() => setMenuOpen(false)}>
                Admin review
              </Link>
            )}
            {user ? (
              <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                <LogOut aria-hidden="true" /> Sign out
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAuthOpen(true);
                  setMenuOpen(false);
                }}
              >
                Sign in
              </Button>
            )}
            <Button
              className="market-nav-cta"
              size="sm"
              onClick={() => {
                setMenuOpen(false);
                void navigate({ to: "/dashboard" });
              }}
            >
              Share your know-how
            </Button>
          </nav>
          <Button
            variant="ghost"
            size="icon"
            className="market-menu-toggle"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>
      </header>
      <MarketplaceAuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
