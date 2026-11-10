<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

Marketplace guide details and the creator studio are top-level routes, with creator data and private files governed by Cloud row and object policies so shareable pages remain public and creator work stays scoped.

AI writing help runs only in authenticated server functions (checking ownership of an editable version whenever one exists) and only fills the form; nothing is saved until the creator presses save, so model output never reaches a listing unreviewed.

Creator dashboard lives under top-level /dashboard routes with a client-side sign-in and onboarding gate; product thumbnails sit in a private bucket readable publicly only for live products, so drafts never leak.

Creator dashboard pages show saved data read-only and switch to a form only via an explicit Edit action, so accidental edits can't happen; the new-product form is the exception.

Creator emails (welcome after onboarding, submit → admin + creator acknowledgement, approve → creator) are sent from authenticated server functions through the Resend connector after the database step succeeds, re-checking state server-side and using idempotency keys, so a failed email never blocks or duplicates a review action; the welcome email is marked sent in the account's app metadata so it goes out once.

Creator help content lives in one data module rendered by the public /creator-help page, so help text, search and the welcome email link stay in sync with the dashboard's real field names and limits.

Resources are delivered by emailed personal links: a public server function records the claim (guest orders carry buyer email/name) and stores only a hash of the link token; the /get/$token page spends a download only when the visitor presses Download (so email link scanners don't count), and expiry/limits/first-download notices are enforced in service-role-only database functions so the browser can't bypass them.
