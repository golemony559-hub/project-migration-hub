import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketplaceAuthDialog } from "@/components/marketplace-auth-dialog";
import { useDownload } from "@/components/guide-access";
import { useMarketplaceAuth } from "@/hooks/use-marketplace-auth";
import { supabase } from "@/integrations/supabase/client";

type Item = {
  id: string;
  created_at: string;
  license_type: string;
  guides: { slug: string; title: string; format: string; category: string } | null;
};

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "My library | Doerly" },
      { name: "description", content: "Resources you have collected on Doerly." },
      { property: "og:title", content: "My library | Doerly" },
      { property: "og:description", content: "Your collected practical resources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { user, ready } = useMarketplaceAuth();
  const [items, setItems] = useState<Item[] | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const download = useDownload();

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("entitlements")
      .select("id, created_at, license_type, guides(slug, title, format, category)")
      .eq("buyer_id", user.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setMsg(error.message);
        setItems((data as Item[] | null) ?? []);
      });
  }, [user]);

  if (!ready) return <main className="market-message"><LoaderCircle className="animate-spin" /></main>;
  if (!user)
    return (
      <main className="market-message">
        <h1>Your library</h1>
        <p>Sign in to see the resources you’ve collected.</p>
        <Button onClick={() => setAuthOpen(true)}>Sign in</Button>
        <MarketplaceAuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </main>
    );

  return (
    <main className="app-page">
      <div>
        <p className="eyebrow">Library</p>
        <h1>My resources</h1>
      </div>
      {msg && <p className="purchase-note" role="alert">{msg}</p>}
      {!items ? (
        <LoaderCircle className="animate-spin" />
      ) : items.length === 0 ? (
        <div className="app-card">
          <p>You haven’t collected any resources yet.</p>
          <Button asChild variant="outline"><Link to="/explore" search={{}}>Explore resources</Link></Button>
        </div>
      ) : (
        <div className="app-grid">
          {items.map((item) => (
            <article key={item.id} className="app-card">
              <p className="app-muted">
                {item.guides?.category} · {item.guides?.format} · added {new Date(item.created_at).toLocaleDateString()}
              </p>
              <h3>{item.guides?.title ?? "Resource"}</h3>
              <div className="creator-guide-actions">
                <Button
                  size="sm"
                  onClick={() =>
                    void download(item.id).catch((e: unknown) =>
                      setMsg(e instanceof Error ? e.message : "Download failed."),
                    )
                  }
                >
                  <Download aria-hidden="true" /> Download
                </Button>
                {item.guides && (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/guide/$slug" params={{ slug: item.guides.slug }}>View listing</Link>
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
