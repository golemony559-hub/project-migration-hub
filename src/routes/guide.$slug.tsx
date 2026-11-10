import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, CheckCircle2, Clock3, Coffee } from "lucide-react";
import { useThumbnailUrls } from "@/hooks/use-thumbnail-urls";
import { Button } from "@/components/ui/button";
import {
  formatGuidePrice,
  parseCreatorProfile,
  sampleGuides,
  type GuideListing,
} from "@/lib/marketplace-data";
import { supabase } from "@/integrations/supabase/client";
import { GuideAccessPanel, GuideCommunity } from "@/components/guide-access";

export const Route = createFileRoute("/guide/$slug")({
  loader: async ({ params }) => {
    const sample = sampleGuides.find((guide) => guide.slug === params.slug);
    const { data: guide, error } = await supabase
      .from("guides")
      .select(
        "id, slug, title, summary, description, category, format, reading_time_minutes, price_cents, currency_code, creator_id, created_at, tags, outcomes, thumbnail_path",
      )
      .eq("slug", params.slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) throw error;
    if (!guide) {
      if (sample) return sample;
      throw notFound();
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, bio, avatar_url, coffee_url")
      .eq("id", guide.creator_id)
      .maybeSingle();

    return {
      ...guide,
      creator_name: profile?.display_name ?? "Independent creator",
      creator_bio: profile?.bio ?? "",
      creator_avatar_url: profile?.avatar_url ?? null,
      coffee_url: profile?.coffee_url ?? "",
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Practical resource"} | Doerly` },
      {
        name: "description",
        content:
          loaderData?.summary ?? "Practical know-how from people with first-hand experience.",
      },
      { property: "og:title", content: `${loaderData?.title ?? "Practical resource"} | Doerly` },
      {
        property: "og:description",
        content:
          loaderData?.summary ?? "Practical know-how from people with first-hand experience.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <main className="market-message">
      <h1>This guide isn’t available right now</h1>
      <p>{error instanceof Error ? error.message : String(error)}</p>
      <Button asChild variant="outline">
        <Link to="/">Back to explore</Link>
      </Button>
    </main>
  ),
  notFoundComponent: () => (
    <main className="market-message">
      <h1>We couldn’t find that guide</h1>
      <Button asChild variant="outline">
        <Link to="/">Back to explore</Link>
      </Button>
    </main>
  ),
  component: GuideDetailPage,
});

function GuideDetailPage() {
  const guide = Route.useLoaderData() as GuideListing;
  const creatorProfile = parseCreatorProfile(guide.creator_bio ?? "");
  const thumbs = useThumbnailUrls([guide.thumbnail_path]);
  const thumbUrl = guide.thumbnail_path ? thumbs[guide.thumbnail_path] : undefined;
  const gains = (guide.outcomes ?? "")
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•\s]+/, "").trim())
    .filter(Boolean);
  const showCoffee = guide.price_cents === 0 && !guide.sample && Boolean(guide.coffee_url);

  return (
    <main className="guide-detail-page">
      <div className="detail-breadcrumb">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft aria-hidden="true" /> Explore guides
          </Link>
        </Button>
      </div>
      <section className="guide-detail-layout">
        <article className="guide-detail-copy">
          <div className="guide-detail-meta">
            <span>{guide.category}</span>
            <span>{guide.format}</span>
          </div>
          {thumbUrl && (
            <img className="guide-detail-thumb" src={thumbUrl} alt={`Cover of ${guide.title}`} />
          )}
          <h1>{guide.title}</h1>
          <p className="guide-detail-summary">{guide.summary}</p>
          <div className="guide-detail-byline">
            {guide.creator_avatar_url ? (
              <img
                className="creator-avatar creator-avatar-image"
                src={guide.creator_avatar_url}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="creator-avatar">{guide.creator_name.slice(0, 1)}</span>
            )}
            <span>
              By <strong>{guide.creator_name}</strong>
            </span>
          </div>
          {(creatorProfile.expertise.length > 0 ||
            creatorProfile.experience ||
            creatorProfile.about) && (
            <div className="creator-bio" aria-label="Creator background">
              {creatorProfile.expertise.length > 0 && (
                <p>
                  <strong>Areas of expertise:</strong> {creatorProfile.expertise.join(", ")}
                </p>
              )}
              {creatorProfile.experience && (
                <p>
                  <strong>Practical experience:</strong> {creatorProfile.experience}
                </p>
              )}
              {creatorProfile.about && (
                <p>
                  <strong>About:</strong> {creatorProfile.about}
                </p>
              )}
              <p className="creator-profile-note">
                This background is self-described, not independently verified by Doerly.
              </p>
            </div>
          )}
          <div className="guide-description">
            <h2>Problem, scope & what’s included</h2>
            <p className="pre-line">{guide.description}</p>
            {guide.tags && guide.tags.length > 0 && (
              <ul className="listing-tags" aria-label="Topics">
                {guide.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            )}
          </div>
          {gains.length > 0 && (
            <div className="guide-gains">
              <h2>What you’ll gain</h2>
              <ul>
                {gains.map((gain) => (
                  <li key={gain}>
                    <CheckCircle2 aria-hidden="true" /> {gain}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
        <aside className="guide-purchase-panel" aria-label="Guide access">
          <p className="eyebrow">A practical resource</p>
          <div className="guide-purchase-facts">
            <span>
              <BookOpen aria-hidden="true" /> {guide.format}
            </span>
            {guide.reading_time_minutes && (
              <span>
                <Clock3 aria-hidden="true" /> {guide.reading_time_minutes} min read
              </span>
            )}
          </div>
          <p className="guide-detail-price">
            {guide.price_cents === 0
              ? "Free"
              : formatGuidePrice(guide.price_cents, guide.currency_code)}
          </p>
          <GuideAccessPanel
            guideId={guide.id}
            priceCents={guide.price_cents}
            isSample={Boolean("sample" in guide && guide.sample)}
          />
          {showCoffee && (
            <div className="coffee-box">
              <p>Found this useful? {guide.creator_name.split(" ")[0]} shares it for free.</p>
              <Button asChild variant="outline" className="coffee-button">
                <a href={guide.coffee_url} target="_blank" rel="noopener noreferrer">
                  <Coffee aria-hidden="true" /> Buy {guide.creator_name.split(" ")[0]} a coffee
                </a>
              </Button>
            </div>
          )}
          {guide.sample && <p className="sample-note">Example listing</p>}
        </aside>
      </section>
      {!("sample" in guide && guide.sample) && <GuideCommunity guideId={guide.id} />}
      <section className="detail-afterword">
        <h2>More useful know-how</h2>
        <p>Browse practical resources from independent creators across different fields.</p>
        <Button asChild variant="outline">
          <Link to="/explore" search={{}}>
            Explore all resources
          </Link>
        </Button>
      </section>
    </main>
  );
}
