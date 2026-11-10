import { createFileRoute, Link } from "@tanstack/react-router";
import { policyDrafts } from "@/lib/policy-drafts";
import { policyPaths } from "@/components/policy-document-page";

const description = "Review the draft Doerly terms, privacy notice, and creator content rules.";

export const Route = createFileRoute("/policies")({
  head: () => ({
    meta: [
      { title: "Policy drafts | Doerly" },
      { name: "description", content: description },
      { property: "og:title", content: "Policy drafts | Doerly" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PolicyDraftsPage,
});

function PolicyDraftsPage() {
  return (
    <main className="policy-page">
      <header className="policy-page-heading">
        <p className="eyebrow">Doerly policies</p>
        <h1>Draft policies for review</h1>
        <p>
          These are working drafts based on the product requirements. They are not final legal
          documents.
        </p>
      </header>

      <ul className="policy-index">
        {policyDrafts.map((policy) => (
          <li key={policy.id}>
            <Link to={policyPaths[policy.id]}>
              {policy.title}
            </Link>
            <p>{policy.introduction}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
