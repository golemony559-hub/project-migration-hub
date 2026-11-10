import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  FileText,
  LoaderCircle,
  LockKeyhole,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarketplaceAuthDialog } from "@/components/marketplace-auth-dialog";
import { useMarketplaceAuth } from "@/hooks/use-marketplace-auth";
import {
  formatGuidePrice,
  marketplaceCategories,
  marketplaceFormats,
  parseCreatorProfile,
  serializeCreatorProfile,
  slugifyGuideTitle,
} from "@/lib/marketplace-data";
import { POLICY_DRAFT_VERSION } from "@/lib/policy-drafts";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendCreatorWelcomeEmail } from "@/lib/review-emails.functions";

export const Route = createFileRoute("/creator")({
  head: () => ({
    meta: [
      { title: "Creator studio | Doerly" },
      { name: "description", content: "Create and manage practical resources on Doerly." },
      { property: "og:title", content: "Creator studio | Doerly" },
      { property: "og:description", content: "Create and manage practical resources on Doerly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatorStudioPage,
});

function CreatorStudioPage() {
  const { user, ready } = useMarketplaceAuth();
  const navigate = useNavigate();
  const sendWelcome = useServerFn(sendCreatorWelcomeEmail);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileExpertise, setProfileExpertise] = useState<string[]>([]);
  const [profileExperience, setProfileExperience] = useState("");
  const [rightsAcknowledged, setRightsAcknowledged] = useState(false);
  const [termsDraftReviewed, setTermsDraftReviewed] = useState(false);
  const [privacyDraftReviewed, setPrivacyDraftReviewed] = useState(false);
  const [creatorRulesDraftReviewed, setCreatorRulesDraftReviewed] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (loaded && onboardingComplete) void navigate({ to: "/dashboard", replace: true });
  }, [loaded, onboardingComplete, navigate]);

  useEffect(() => {
    if (!ready || !user || !user.email_confirmed_at) return;
    setLoaded(false);
    setOnboardingComplete(false);
    let active = true;
    async function loadStudio() {
      // Read the account fresh so onboarding acknowledgements are always current.
      const { data: fresh } = await supabase.auth.getUser();
      const currentUser = fresh.user ?? user!;
      const profileResult = await supabase
        .from("profiles")
        .select("display_name, bio, avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle();
      if (!active) return;
      if (profileResult.error) {
        setFeedback(profileResult.error.message || "Your creator space could not be loaded.");
      } else {
        const profile = parseCreatorProfile(profileResult.data?.bio ?? "");
        const displayName =
          profileResult.data?.display_name ?? currentUser.user_metadata["full_name"] ?? "";
        setProfileName(displayName === "New member" ? "" : displayName);
        setProfileAvatarUrl(profileResult.data?.avatar_url ?? "");
        setProfileBio(profile.about);
        setProfileExpertise(profile.expertise);
        setProfileExperience(profile.experience);
        const policyVersion = currentUser.user_metadata["doerly_policy_draft_version"];
        const termsReviewed =
          policyVersion === POLICY_DRAFT_VERSION &&
          Boolean(currentUser.user_metadata["doerly_terms_draft_reviewed_at"]);
        const privacyReviewed =
          policyVersion === POLICY_DRAFT_VERSION &&
          Boolean(currentUser.user_metadata["doerly_privacy_draft_reviewed_at"]);
        const creatorRulesReviewed =
          policyVersion === POLICY_DRAFT_VERSION &&
          Boolean(currentUser.user_metadata["doerly_creator_rules_draft_reviewed_at"]);
        setTermsDraftReviewed(termsReviewed);
        setPrivacyDraftReviewed(privacyReviewed);
        setCreatorRulesDraftReviewed(creatorRulesReviewed);
        const profileBasicsComplete = Boolean(displayName.trim() && profile.about.trim());
        const expertiseDetailsComplete = Boolean(
          profile.expertise.length && profile.experience.trim(),
        );
        setOnboardingStep(profileBasicsComplete ? (expertiseDetailsComplete ? 3 : 2) : 1);
        setOnboardingComplete(
          Boolean(
            displayName.trim() &&
            displayName !== "New member" &&
            profile.expertise.length &&
            profile.experience &&
            profile.about &&
            currentUser.user_metadata["doerly_creator_rights_acknowledged_at"] &&
            termsReviewed &&
            privacyReviewed &&
            creatorRulesReviewed,
          ),
        );
      }
      setLoaded(true);
    }
    void loadStudio();
    return () => {
      active = false;
    };
  }, [ready, user]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    if (
      !onboardingComplete &&
      onboardingStep === 1 &&
      (!profileName.trim() || !profileBio.trim())
    ) {
      setFeedback("Add your display name and short introduction to continue.");
      return;
    }
    if ((onboardingComplete || onboardingStep === 2) && !profileExpertise.length) {
      setFeedback("Choose at least one area of expertise.");
      return;
    }
    if ((onboardingComplete || onboardingStep === 2) && !profileExperience.trim()) {
      setFeedback("Describe your practical experience to continue.");
      return;
    }
    if (!onboardingComplete && onboardingStep === 3 && !rightsAcknowledged) {
      setFeedback("Confirm that you have the right to share your materials.");
      return;
    }
    if (
      !onboardingComplete &&
      onboardingStep === 3 &&
      (!termsDraftReviewed || !privacyDraftReviewed || !creatorRulesDraftReviewed)
    ) {
      setFeedback("Review and acknowledge each policy draft to finish creator setup.");
      return;
    }
    const avatarUrl = profileAvatarUrl.trim();
    if (avatarUrl) {
      try {
        if (new URL(avatarUrl).protocol !== "https:") {
          setFeedback("Use a secure HTTPS image link for your public profile photo.");
          return;
        }
      } catch {
        setFeedback("Enter a valid HTTPS image link for your public profile photo.");
        return;
      }
    }
    setLoading(true);
    setFeedback("");
    const bio = serializeCreatorProfile({
      expertise: profileExpertise,
      experience: profileExperience,
      about: profileBio,
    });
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: profileName.trim(),
        bio,
        avatar_url: avatarUrl || null,
      })
      .select("id")
      .single();
    if (error) {
      setFeedback(error.message);
      setLoading(false);
      return;
    }
    if (!onboardingComplete && onboardingStep < 3) {
      setOnboardingStep((step) => step + 1);
      setFeedback(
        onboardingStep === 1
          ? "Profile details saved. Next, add your areas of expertise and practical experience."
          : "Experience details saved. Review your creator commitments before finishing.",
      );
      setLoading(false);
      return;
    }
    if (!onboardingComplete) {
      const acknowledgedAt = new Date().toISOString();
      const { error: acknowledgmentError } = await supabase.auth.updateUser({
        data: {
          doerly_creator_rights_acknowledged_at: acknowledgedAt,
          doerly_policy_draft_version: POLICY_DRAFT_VERSION,
          doerly_terms_draft_reviewed_at: acknowledgedAt,
          doerly_privacy_draft_reviewed_at: acknowledgedAt,
          doerly_creator_rules_draft_reviewed_at: acknowledgedAt,
        },
      });
      if (acknowledgmentError) {
        setFeedback(
          `Your profile was saved, but the acknowledgment could not be saved: ${acknowledgmentError.message}`,
        );
        setLoading(false);
        return;
      }
      setRightsAcknowledged(false);
      // Welcome email with the help-page link; a failed email never blocks onboarding.
      void sendWelcome().catch((error: unknown) => console.error("welcome email failed", error));
      setOnboardingComplete(true);
      setFeedback(
        "Your creator profile is complete. Your resources and files will remain private drafts.",
      );
    } else {
      setFeedback("Your creator profile is saved.");
    }
    setLoading(false);
  }

  async function resendVerification() {
    if (!user?.email) return;
    setVerificationBusy(true);
    setVerificationFeedback("");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: { emailRedirectTo: window.location.href },
    });
    setVerificationFeedback(
      error
        ? error.message
        : "A verification link has been sent. Check your inbox and spam folder.",
    );
    setVerificationBusy(false);
  }

  function toggleExpertise(item: string) {
    setProfileExpertise((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
  }

  if (!ready)
    return (
      <main className="market-message">
        <LoaderCircle className="animate-spin" aria-label="Loading account" />
      </main>
    );
  if (!user) {
    return (
      <main className="creator-gate">
        <div className="creator-gate-copy">
          <p className="eyebrow">Creator studio</p>
          <h1>Make your experience useful to someone else.</h1>
          <p>
            Build a clear guide, playbook, or toolkit and share it with people looking for practical
            answers.
          </p>
          <Button onClick={() => setAuthOpen(true)}>Create a creator account</Button>
        </div>
        <div className="creator-gate-note">
          <LockKeyhole aria-hidden="true" />
          <p>Your drafts and uploaded files are private to your account.</p>
        </div>
        <MarketplaceAuthDialog
          open={authOpen}
          onOpenChange={setAuthOpen}
          initialMode="signup"
          signupPurpose="creator"
        />
      </main>
    );
  }
  if (!user.email_confirmed_at) {
    return (
      <main className="creator-gate">
        <div className="creator-gate-copy">
          <p className="eyebrow">Verify your email</p>
          <h1>Confirm your email to continue.</h1>
          <p>
            Creator onboarding and private drafts are available after you verify the email address
            on your account.
          </p>
          <Button onClick={() => void resendVerification()} disabled={verificationBusy}>
            {verificationBusy ? <LoaderCircle className="animate-spin" /> : <Check />}
            Resend verification link
          </Button>
          {verificationFeedback && (
            <p className="auth-feedback" role="status">
              {verificationFeedback}
            </p>
          )}
        </div>
        <div className="creator-gate-note">
          <LockKeyhole aria-hidden="true" />
          <p>Your creator area remains private until email verification is complete.</p>
        </div>
      </main>
    );
  }
  if (!loaded) {
    return (
      <main className="market-message">
        <LoaderCircle className="animate-spin" aria-label="Loading creator profile" />
      </main>
    );
  }

  return (
    <main className="creator-studio">
      <section className="creator-studio-heading">
        <p className="eyebrow">{onboardingComplete ? "Creator studio" : "Creator onboarding"}</p>
        <h1>
          {onboardingComplete
            ? "Your know-how, ready to share."
            : onboardingStep === 1
              ? "Set up your public profile."
              : onboardingStep === 2
                ? "Show buyers what you know."
                : "Review your creator details."}
        </h1>
        <p>
          {onboardingComplete
            ? "Describe what you’ve learned, save a private draft, and prepare a useful resource for Doerly."
            : "Complete three short steps. Your profile details are saved so you can return and finish later."}
        </p>
      </section>
      {!onboardingComplete && (
        <ol className="onboarding-progress" aria-label="Creator onboarding progress">
          {["Public profile", "Expertise", "Confirm"].map((label, index) => {
            const step = index + 1;
            const state =
              step < onboardingStep ? "complete" : step === onboardingStep ? "current" : "upcoming";
            return (
              <li
                key={label}
                className={`onboarding-progress-step is-${state}`}
                aria-current={step === onboardingStep ? "step" : undefined}
              >
                <span>{step < onboardingStep ? <Check aria-hidden="true" /> : `0${step}`}</span>
                <span>{label}</span>
              </li>
            );
          })}
        </ol>
      )}
      <div className={`creator-studio-layout ${onboardingComplete ? "" : "is-onboarding"}`}>
        <div className="creator-studio-main">
          <section className="studio-section">
            <div className="studio-section-heading">
              <div>
                <span className="studio-step">
                  {onboardingComplete ? "01" : `0${onboardingStep}`}
                </span>
                <div>
                  <h2>
                    {onboardingComplete
                      ? "Your creator profile"
                      : onboardingStep === 1
                        ? "Public profile"
                        : onboardingStep === 2
                          ? "Expertise and experience"
                          : "Review and confirm"}
                  </h2>
                  <p>
                    {onboardingComplete
                      ? "Keep your public details accurate and relevant to your resources."
                      : onboardingStep === 3
                        ? "Check the details buyers will see, then confirm your content responsibilities."
                        : "This information helps buyers decide whether your experience fits their situation."}
                  </p>
                </div>
              </div>
            </div>
            <form
              className="studio-form profile-form"
              onSubmit={(event) => void saveProfile(event)}
            >
              {(onboardingComplete || onboardingStep === 1) && (
                <>
                  <label className="studio-field">
                    Display name
                    <Input
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                      maxLength={80}
                      autoComplete="name"
                      required
                    />
                  </label>
                  <label className="studio-field">
                    Profile image URL <span className="field-hint">(optional)</span>
                    <Input
                      type="url"
                      value={profileAvatarUrl}
                      onChange={(event) => setProfileAvatarUrl(event.target.value)}
                      placeholder="https://example.com/your-photo.jpg"
                      inputMode="url"
                    />
                    <span className="field-hint">
                      Use a secure image link. It will be visible on your public creator profile.
                    </span>
                  </label>
                  {profileAvatarUrl.trim() && (
                    <img
                      className="profile-avatar-preview"
                      src={profileAvatarUrl}
                      alt="Preview of your public profile image"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <label className="studio-field">
                    About you
                    <Textarea
                      value={profileBio}
                      onChange={(event) => setProfileBio(event.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="A short introduction for people considering your resources."
                      required
                    />
                    <span className="field-hint">
                      Your background is self-described, not independently verified by Doerly.
                    </span>
                  </label>
                </>
              )}
              {(onboardingComplete || onboardingStep === 2) && (
                <>
                  <div className="studio-field" role="group" aria-label="Areas of expertise">
                    <span>Areas of expertise</span>
                    <div className="expertise-options">
                      {marketplaceCategories
                        .filter((item) => item !== "All knowledge")
                        .map((item) => (
                          <Button
                            key={item}
                            type="button"
                            size="sm"
                            variant={profileExpertise.includes(item) ? "default" : "outline"}
                            aria-pressed={profileExpertise.includes(item)}
                            onClick={() => toggleExpertise(item)}
                          >
                            {item}
                          </Button>
                        ))}
                    </div>
                    <span className="field-hint">
                      Select every field relevant to your practical experience.
                    </span>
                  </div>
                  <label className="studio-field">
                    Practical experience
                    <Textarea
                      value={profileExperience}
                      onChange={(event) => setProfileExperience(event.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="What have you done in these fields? Include useful context such as years or types of work."
                      required
                    />
                  </label>
                </>
              )}
              {!onboardingComplete && onboardingStep === 3 && (
                <div className="onboarding-review">
                  <dl>
                    <div>
                      <dt>Display name</dt>
                      <dd>{profileName || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt>Areas of expertise</dt>
                      <dd>{profileExpertise.join(", ") || "Choose at least one field"}</dd>
                    </div>
                    <div>
                      <dt>Practical experience</dt>
                      <dd>{profileExperience || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt>About you</dt>
                      <dd>{profileBio || "Not provided"}</dd>
                    </div>
                  </dl>
                  <label className="creator-consent">
                    <input
                      type="checkbox"
                      checked={termsDraftReviewed}
                      onChange={(event) => setTermsDraftReviewed(event.target.checked)}
                      required
                    />
                    <span>
                      I reviewed the draft{" "}
                      <a href="/terms" target="_blank" rel="noreferrer">
                        Terms of Use
                      </a>
                      .
                    </span>
                  </label>
                  <label className="creator-consent">
                    <input
                      type="checkbox"
                      checked={privacyDraftReviewed}
                      onChange={(event) => setPrivacyDraftReviewed(event.target.checked)}
                      required
                    />
                    <span>
                      I reviewed the draft{" "}
                      <a href="/privacy" target="_blank" rel="noreferrer">
                        Privacy Notice
                      </a>
                      .
                    </span>
                  </label>
                  <label className="creator-consent">
                    <input
                      type="checkbox"
                      checked={creatorRulesDraftReviewed}
                      onChange={(event) => setCreatorRulesDraftReviewed(event.target.checked)}
                      required
                    />
                    <span>
                      I reviewed the draft{" "}
                      <a href="/creator-rules" target="_blank" rel="noreferrer">
                        Creator Content Rules
                      </a>
                      .
                    </span>
                  </label>
                  <label className="creator-consent">
                    <input
                      type="checkbox"
                      checked={rightsAcknowledged}
                      onChange={(event) => setRightsAcknowledged(event.target.checked)}
                      required
                    />
                    <span>
                      I have the right to share materials I submit, will describe my resources and
                      experience accurately, and understand that I’m responsible for addressing
                      relevant buyer-support requests.
                    </span>
                  </label>
                </div>
              )}
              <div className="creator-form-actions">
                {!onboardingComplete && onboardingStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOnboardingStep((step) => Math.max(1, step - 1));
                      setFeedback("");
                    }}
                    disabled={loading}
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="submit"
                  variant={onboardingComplete ? "outline" : "default"}
                  disabled={loading}
                >
                  {loading ? <LoaderCircle className="animate-spin" /> : <Check />}
                  {onboardingComplete
                    ? "Save profile"
                    : onboardingStep < 3
                      ? "Save and continue"
                      : "Complete creator setup"}
                </Button>
              </div>
            </form>
          </section>

          {feedback && (
            <p className="studio-feedback" role="status">
              {feedback}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
