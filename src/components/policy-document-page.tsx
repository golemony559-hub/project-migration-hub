import { Link } from "@tanstack/react-router";
import { policyDrafts, type PolicyDocument } from "@/lib/policy-drafts";

export const policyPaths = {
  terms: "/terms",
  privacy: "/privacy",
  "creator-rules": "/creator-rules",
} as const satisfies Record<PolicyDocument["id"], string>;

function sectionId(index: number) {
  return `section-${index + 1}`;
}

export function PolicyDocumentPage({ policyId }: { policyId: PolicyDocument["id"] }) {
  const policy = policyDrafts.find((item) => item.id === policyId);
  if (!policy) return null;

  return (
    <main className="policy-page">
      <header className="policy-page-heading">
        <p className="eyebrow">Doerly policies</p>
        <h1>{policy.title}</h1>
        <p className="policy-updated">Last updated {policy.lastUpdated}</p>
        <p>{policy.introduction}</p>
      </header>

      <aside className="policy-draft-warning" role="note">
        <strong>Draft — not approved for launch</strong>
        <p>
          This document is still being reviewed and is not yet final. Checkout stays disabled until
          the terms, privacy practices, launch markets, buyer remedies, and required legal review
          are confirmed.
        </p>
      </aside>

      {policy.sections.length > 5 && (
        <nav className="policy-contents" aria-label="Contents">
          <p className="eyebrow">Contents</p>
          <ol>
            {policy.sections.map((section, index) => (
              <li key={section.heading}>
                <a href={`#${sectionId(index)}`}>{section.heading}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <article className="policy-document">
        {policy.sections.map((section, index) => (
          <section key={section.heading} id={sectionId(index)}>
            <h2>
              <span className="policy-section-number">{index + 1}.</span> {section.heading}
            </h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets && (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
            {section.closing?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </article>

      <nav className="policy-page-footer" aria-label="Other policies">
        {policyDrafts
          .filter((item) => item.id !== policy.id)
          .map((item) => (
            <Link key={item.id} to={policyPaths[item.id]}>
              {item.title}
            </Link>
          ))}
        <Link to="/">Back to Doerly</Link>
      </nav>
    </main>
  );
}
