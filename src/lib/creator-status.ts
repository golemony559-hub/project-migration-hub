import type { User } from "@supabase/supabase-js";
import { parseCreatorProfile } from "@/lib/marketplace-data";
import { POLICY_DRAFT_VERSION } from "@/lib/policy-drafts";

/** True once the creator finished all three onboarding steps. */
export function isCreatorOnboarded(
  user: Pick<User, "user_metadata">,
  profile: { display_name: string; bio: string } | null,
) {
  if (!profile) return false;
  const details = parseCreatorProfile(profile.bio ?? "");
  const meta = user.user_metadata ?? {};
  const policiesCurrent =
    meta["doerly_policy_draft_version"] === POLICY_DRAFT_VERSION &&
    Boolean(meta["doerly_terms_draft_reviewed_at"]) &&
    Boolean(meta["doerly_privacy_draft_reviewed_at"]) &&
    Boolean(meta["doerly_creator_rules_draft_reviewed_at"]);
  return Boolean(
    profile.display_name.trim() &&
      profile.display_name !== "New member" &&
      details.expertise.length &&
      details.experience &&
      details.about &&
      meta["doerly_creator_rights_acknowledged_at"] &&
      policiesCurrent,
  );
}
