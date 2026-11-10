import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, LoaderCircle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset your password | Doerly" },
      { name: "description", content: "Choose a new password for your Doerly account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    if (password !== confirmPassword) {
      setFeedback("The passwords don’t match.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setFeedback(error.message);
    } else {
      setUpdated(true);
    }
    setBusy(false);
  }

  return (
    <main className="reset-password-page">
      <section className="reset-password-card">
        <span className="auth-mark">
          <LockKeyhole aria-hidden="true" />
        </span>
        <p className="eyebrow">Account recovery</p>
        <h1>{updated ? "Password updated" : "Choose a new password"}</h1>
        {updated ? (
          <>
            <p>Your password has been changed. Sign in with the new password to continue.</p>
            <Button asChild>
              <Link to="/">
                <ArrowLeft aria-hidden="true" /> Back to Doerly
              </Link>
            </Button>
          </>
        ) : (
          <form className="studio-form" onSubmit={(event) => void savePassword(event)}>
            <label className="studio-field">
              New password
              <Input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="studio-field">
              Confirm new password
              <Input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
            {feedback && (
              <p className="auth-feedback" role="status">
                {feedback}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? <LoaderCircle className="animate-spin" /> : <Check aria-hidden="true" />}
              Update password
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
