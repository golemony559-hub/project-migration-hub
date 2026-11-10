import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Coffee, LoaderCircle, LogOut, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useCreator } from "@/components/creator/creator-context";
import { DashHeading } from "@/components/creator/product-bits";
import { isSafeHttpsUrl } from "@/lib/creator-products";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Creator dashboard | Doerly" },
      { name: "description", content: "Your tip link, account and sign-in settings." },
      { property: "og:title", content: "Settings | Creator dashboard | Doerly" },
      { property: "og:description", content: "Your tip link, account and sign-in settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile, reloadProfile } = useCreator();
  const navigate = useNavigate();
  const [coffeeUrl, setCoffeeUrl] = useState(profile.coffee_url);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  async function saveCoffee(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = coffeeUrl.trim();
    if (value && !isSafeHttpsUrl(value)) {
      toast.error("Use a full link starting with https://");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ coffee_url: value })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await reloadProfile();
    setEditing(false);
    toast.success(value ? "Your “Buy me a coffee” link is saved." : "Coffee button removed.");
  }

  async function sendReset() {
    if (!user.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset link sent to your email.");
  }

  return (
    <>
      <DashHeading eyebrow="Settings" title="Settings" />
      <section className="dash-section">
        <h2>
          <Coffee aria-hidden="true" /> “Buy me a coffee” button
        </h2>
        <p className="app-muted">
          On your <strong>free</strong> products, readers see a “Buy me a coffee” button that opens
          this link. Use your Buy Me a Coffee, Ko-fi, PayPal.me or any other tip page.
        </p>
        {editing ? (
          <form className="settings-row" onSubmit={(e) => void saveCoffee(e)}>
            <Input
              type="url"
              inputMode="url"
              value={coffeeUrl}
              onChange={(e) => setCoffeeUrl(e.target.value)}
              placeholder="https://buymeacoffee.com/yourname"
              maxLength={300}
              aria-label="Tip link"
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setCoffeeUrl(profile.coffee_url);
                setEditing(false);
              }}
            >
              <X aria-hidden="true" /> Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <LoaderCircle className="animate-spin" /> : null} Save
            </Button>
          </form>
        ) : (
          <div className="settings-row readonly-row">
            <span className={profile.coffee_url ? "readonly-value" : "readonly-value app-muted"}>
              {profile.coffee_url || "No link yet — the coffee button stays hidden until you add one."}
            </span>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil aria-hidden="true" /> {profile.coffee_url ? "Edit link" : "Add link"}
            </Button>
          </div>
        )}
      </section>
      <section className="dash-section">
        <h2>Account</h2>
        <dl className="settings-dl">
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{new Date(user.created_at).toLocaleDateString()}</dd>
          </div>
        </dl>
        <div className="product-actions-bar">
          <Button variant="outline" onClick={() => void sendReset()}>
            Send password reset link
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await supabase.auth.signOut();
              void navigate({ to: "/", replace: true });
            }}
          >
            <LogOut aria-hidden="true" /> Sign out
          </Button>
        </div>
      </section>
    </>
  );
}
