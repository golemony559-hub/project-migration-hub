import { Link } from "@tanstack/react-router";
import { ArrowRight, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatGuidePrice, type GuideListing } from "@/lib/marketplace-data";
import { GOALS, groupForGoal, rankForGoal, type Goal } from "@/lib/goals";
import { categoryToneClass } from "@/lib/category-colors";

/** "What do you want to accomplish?" chips linking to goal recommendations. */
export function GoalChips({ activeId }: { activeId?: string }) {
  return (
    <div className="goal-chips" aria-label="Pick a goal">
      <span className="goal-chips-label">
        <Target aria-hidden="true" /> Or pick a goal:
      </span>
      {GOALS.map((g) => (
        <Link
          key={g.id}
          to="/explore"
          search={{ goal: g.id }}
          className={g.id === activeId ? "goal-chip is-active" : "goal-chip"}
        >
          {g.label}
        </Link>
      ))}
    </div>
  );
}

/** Recommended resources for one goal, grouped in the order a learner would use them. */
export function GoalRecommendations({ goal, listings }: { goal: Goal; listings: GuideListing[] }) {
  const ranked = rankForGoal(listings, goal);
  const groups = groupForGoal(ranked);
  return (
    <section className="goal-recs" aria-labelledby="goal-recs-title">
      <p className="eyebrow">Your goal</p>
      <h2 id="goal-recs-title">{goal.label}</h2>
      {groups.length === 0 ? (
        <p className="goal-recs-empty">
          We don’t have resources for this goal yet. Browse everything below, or check back soon.
        </p>
      ) : (
        <>
          <p className="goal-recs-intro">
            {ranked.length} {ranked.length === 1 ? "resource" : "resources"} picked for this goal, in the order
            most people use them.
          </p>
          {groups.map((group) => (
            <div key={group.label} className="goal-recs-group">
              <h3>{group.label}</h3>
              <ul>
                {group.items.map((g) => (
                  <li key={g.id}>
                    <span className={categoryToneClass(g.category)}>{g.category}</span>
                    <Link to="/guide/$slug" params={{ slug: g.slug }}>
                      {g.title}
                    </Link>
                    <span className="goal-recs-meta">
                      {g.format} · {g.price_cents === 0 ? "Free" : formatGuidePrice(g.price_cents, g.currency_code)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
      <Button asChild variant="ghost" size="sm">
        <Link to="/explore" search={{}}>
          Clear goal <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}
