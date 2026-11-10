import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GuideCatalog } from "@/components/guide-catalog";
import { sampleGuides, type GuideListing } from "@/lib/marketplace-data";
import poultryPhotoAsset from "@/assets/poultry-knowledge.jpg.asset.json";

const poultryPhoto = poultryPhotoAsset.url;
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  loader: async () => {
    const { data: guides, error } = await supabase
      .from("guides")
      .select(
        "id, slug, title, summary, description, category, format, reading_time_minutes, price_cents, currency_code, creator_id, created_at, thumbnail_path, tags, outcomes, audience, contents",
      )
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!guides?.length) return [];
    const creatorIds = [...new Set(guides.map((guide) => guide.creator_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name, bio, avatar_url")
      .in("id", creatorIds);
    if (profilesError) throw profilesError;
    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    return guides.map((guide) => ({
      ...guide,
      creator_name: profileById.get(guide.creator_id)?.display_name ?? "Independent creator",
      creator_bio: profileById.get(guide.creator_id)?.bio ?? "",
      creator_avatar_url: profileById.get(guide.creator_id)?.avatar_url ?? null,
    }));
  },
  head: () => ({
    meta: [
      { title: "Practical guides and playbooks | Doerly" },
      {
        name: "description",
        content:
          "Find practical guides, ebooks, and playbooks created by people with first-hand experience.",
      },
      { property: "og:title", content: "Practical guides and playbooks | Doerly" },
      {
        property: "og:description",
        content:
          "Find practical guides, ebooks, and playbooks created by people with first-hand experience.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <main className="market-message">
      <h1>We couldn’t load Doerly</h1>
      <p>{error instanceof Error ? error.message : String(error)}</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="market-message">
      <h1>Nothing here yet</h1>
    </main>
  ),
  component: MarketplaceHome,
});

function MarketplaceHome() {
  const liveListings = Route.useLoaderData() as (GuideListing & { creator_name: string })[];
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const liveSlugs = new Set(liveListings.map((guide) => guide.slug));
  const listings = [...liveListings, ...sampleGuides.filter((guide) => !liveSlugs.has(guide.slug))];

  return (
    <main>
      <section className="market-hero">
        <div className="market-hero-copy">
          <p className="eyebrow">Field notes, made useful</p>
          <h1>
            Learn it from someone who’s <em>done it.</em>
          </h1>
          <p className="market-hero-intro">
            Straightforward guides, playbooks, and tools from people who know the work first-hand.
          </p>
          <form
            className="market-search"
            onSubmit={(event) => {
              event.preventDefault();
              void navigate({ to: "/explore", search: { q: query } });
            }}
            role="search"
          >
            <Search aria-hidden="true" />
            <Input
              aria-label="Search practical resources"
              placeholder="What are you trying to figure out?"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button type="submit">Find a resource</Button>
          </form>
          <div className="market-proof">
            <span>Practical knowledge</span>
            <span>Independent creators</span>
            <span>Useful from day one</span>
          </div>
        </div>
        <div className="market-hero-image-wrap">
          <img
            src={poultryPhoto}
            alt="A poultry farmer tending to a flock in a sunlit coop"
            className="market-hero-image"
          />
        </div>
      </section>

      <section className="market-catalog" aria-labelledby="catalog-title">
        <GuideCatalog listings={listings} showSearch={false} showAdvancedFilters={false} />
        <Button asChild className="catalog-more" variant="outline">
          <Link to="/explore" search={{}}>
            Explore all resources <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>

      <section className="creator-band">
        <div>
          <p className="eyebrow">For the people who know</p>
          <h2>Your experience can help someone else.</h2>
          <p>Turn what you’ve learned into a clear guide, playbook, or toolkit.</p>
        </div>
        <Button asChild variant="secondary">
          <Link to="/creator">
            Start creating <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>
    </main>
  );
}
