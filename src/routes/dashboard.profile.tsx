import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCreator } from "@/components/creator/creator-context";
import { DashHeading } from "@/components/creator/product-bits";
import {
  marketplaceCategories,
  parseCreatorProfile,
  serializeCreatorProfile,
} from "@/lib/marketplace-data";
import { isSafeHttpsUrl } from "@/lib/creator-products";

export const Route = createFileRoute("/dashboard/profile")({
  head: () => ({
    meta: [
      { title: "Profile | Creator dashboard | Doerly" },
      {
        name: "description",
        content: "Edit the public creator profile readers see on your products.",
      },
      { property: "og:title", content: "Profile | Creator dashboard | Doerly" },
      {
        property: "og:description",
        content: "Edit the public creator profile readers see on your products.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, reloadProfile } = useCreator();
  const initial = parseCreatorProfile(profile.bio);
  const [name, setName] = useState(profile.display_name);
  const [avatar, setAvatar] = useState(profile.avatar_url ?? "");
  const [about, setAbout] = useState(initial.about);
  const [experience, setExperience] = useState(initial.experience);
  const [expertise, setExpertise] = useState<string[]>(initial.expertise);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  function cancel() {
    const saved = parseCreatorProfile(profile.bio);
    setName(profile.display_name);
    setAvatar(profile.avatar_url ?? "");
    setAbout(saved.about);
    setExperience(saved.experience);
    setExpertise(saved.expertise);
    setEditing(false);
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || name.trim() === "New member") {
      toast.error("Add your display name.");
      return;
    }
    if (!about.trim()) {
      toast.error("Add a short introduction.");
      return;
    }
    if (!expertise.length) {
      toast.error("Choose at least one area of expertise.");
      return;
    }
    if (!experience.trim()) {
      toast.error("Describe your practical experience.");
      return;
    }
    if (avatar.trim() && !isSafeHttpsUrl(avatar)) {
      toast.error("Profile image must be an https:// link.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim(),
        avatar_url: avatar.trim() || null,
        bio: serializeCreatorProfile({ expertise, experience, about }),
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await reloadProfile();
    setEditing(false);
    toast.success("Profile saved.");
  }

  const header = (
    <div className="profile-head">
      {avatar.trim() ? (
        <img
          className="profile-avatar-preview"
          src={avatar}
          alt="Your profile"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="creator-avatar is-large">{name.charAt(0)}</span>
      )}
      <p className="app-muted">
        Shown next to your products. Your background is self-described, not verified by Doerly.
      </p>
    </div>
  );

  if (!editing) {
    return (
      <>
        <DashHeading eyebrow="Profile" title="Your public profile">
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" /> Edit profile
          </Button>
        </DashHeading>
        <section className="dash-section">
          {header}
          <dl className="readonly-fields">
            <div>
              <dt>Display name</dt>
              <dd>{profile.display_name}</dd>
            </div>
            <div>
              <dt>Profile image link</dt>
              <dd>{profile.avatar_url || "—"}</dd>
            </div>
            <div>
              <dt>About you</dt>
              <dd className="pre-line">{initial.about || "—"}</dd>
            </div>
            <div>
              <dt>Areas of expertise</dt>
              <dd>{initial.expertise.length ? initial.expertise.join(", ") : "—"}</dd>
            </div>
            <div>
              <dt>Practical experience</dt>
              <dd className="pre-line">{initial.experience || "—"}</dd>
            </div>
          </dl>
        </section>
      </>
    );
  }

  return (
    <>
      <DashHeading eyebrow="Profile" title="Edit your public profile" />
      <form className="dash-section product-form-section" onSubmit={(e) => void save(e)}>
        {header}
        <label className="studio-field">
          Display name
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
        </label>
        <label className="studio-field">
          Profile image link <span className="field-hint">(optional)</span>
          <Input
            type="url"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <label className="studio-field">
          About you
          <Textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={3}
            maxLength={500}
            required
          />
        </label>
        <div className="studio-field" role="group" aria-label="Areas of expertise">
          <span>Areas of expertise</span>
          <div className="expertise-options">
            {marketplaceCategories
              .filter((c) => c !== "All knowledge")
              .map((c) => (
                <Button
                  key={c}
                  type="button"
                  size="sm"
                  variant={expertise.includes(c) ? "default" : "outline"}
                  aria-pressed={expertise.includes(c)}
                  onClick={() =>
                    setExpertise((cur) =>
                      cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c],
                    )
                  }
                >
                  {c}
                </Button>
              ))}
          </div>
        </div>
        <label className="studio-field">
          Practical experience
          <Textarea
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            rows={3}
            maxLength={500}
            required
          />
        </label>
        <div className="product-form-actions">
          <Button type="button" variant="ghost" disabled={busy} onClick={cancel}>
            <X aria-hidden="true" /> Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <LoaderCircle className="animate-spin" />} Save profile
          </Button>
        </div>
      </form>
    </>
  );
}
