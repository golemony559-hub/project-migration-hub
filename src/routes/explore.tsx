import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { GuideCatalog } from "@/components/guide-catalog";
import { sampleGuides, type GuideListing } from "@/lib/marketplace-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/explore")({
  validateSearch: z.object({ q: z.string().optional() }),
  loader: async () => {
    const { data: guides, error } = await supabase
      .from("guides")
      .select(
        "id, slug, title, summary, description, category, format, reading_time_minutes, price_cents, currency_code, creator_id, created_at, thumbnail_path, tags, outcomes, audience, contents",
      )
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const creatorIds = [...new Set((guides ?? []).map((guide) => guide.creator_id))];
    const { data: profiles, error: profilesError } = creatorIds.length
      ? await supabase
          .from("profiles")
          .select("id, display_name, bio, avatar_url")
          .in("id", creatorIds)
      : { data: [], error: null };
    if (profilesError) throw profilesError;

    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const liveListings: GuideListing[] = (guides ?? []).map((guide) => ({
      ...guide,
      creator_name: profileById.get(guide.creator_id)?.display_name ?? "Independent creator",
      creator_bio: profileById.get(guide.creator_id)?.bio ?? "",
      creator_avatar_url: profileById.get(guide.creator_id)?.avatar_url ?? null,
    }));
    const liveSlugs = new Set(liveListings.map((guide) => guide.slug));
    return [...liveListings, ...sampleGuides.filter((guide) => !liveSlugs.has(guide.slug))];
  },
  head: () => ({
    meta: [
      { title: "Explore practical resources | Doerly" },
      {
        name: "description",
        content:
          "Search and browse practical guides, playbooks and tools from people with first-hand experience.",
      },
      { property: "og:title", content: "Explore practical resources | Doerly" },
      {
        property: "og:description",
        content:
          "Search and browse practical guides, playbooks and tools from people with first-hand experience.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const listings = Route.useLoaderData();
  const { q } = Route.useSearch();

  return (
    <main>
      <section className="market-catalog explore-catalog" aria-label="Explore resources">
        <GuideCatalog listings={listings} initialQuery={q ?? ""} />
      </section>
    </main>
  );
}
