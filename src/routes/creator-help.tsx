import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Lightbulb, Mail, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  CREATOR_HELP_UPDATED,
  creatorSupportEmail,
  quickStart,
  searchHelp,
  type HelpBlock,
} from "@/lib/creator-help";

const title = "Creator help centre | Doerly";
const description =
  "Everything Doerly creators need: profile setup, adding products, the AI writing helper, pricing, review, updates, earnings and troubleshooting.";

export const Route = createFileRoute("/creator-help")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreatorHelpPage,
});

function Block({ block }: { block: HelpBlock }) {
  switch (block.kind) {
    case "p":
      return <p>{block.text}</p>;
    case "h3":
      return <h3>{block.text}</h3>;
    case "steps":
      return (
        <ol className="help-steps">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      );
    case "list":
      return (
        <ul className="help-list">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "tip":
    case "warning":
      return (
        <aside className={`help-callout is-${block.kind}`} role="note">
          {block.kind === "tip" ? (
            <Lightbulb aria-hidden="true" />
          ) : (
            <AlertTriangle aria-hidden="true" />
          )}
          <div>
            <strong>{block.title}</strong>
            <p>{block.text}</p>
          </div>
        </aside>
      );
    case "table":
      return (
        <div className="help-table-wrap">
          <table className="help-table">
            <thead>
              <tr>
                <th scope="col">{block.columns[0]}</th>
                <th scope="col">{block.columns[1]}</th>
              </tr>
            </thead>
            <tbody>
              {block.rows.map(([a, b]) => (
                <tr key={a}>
                  <th scope="row">{a}</th>
                  <td>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "link":
      return (
        <p className="help-link">
          <Link to={block.to}>
            {block.label} <ArrowRight aria-hidden="true" />
          </Link>
        </p>
      );
  }
}

function CreatorHelpPage() {
  const [query, setQuery] = useState("");
  const { sections, faqs } = useMemo(() => searchHelp(query), [query]);
  const searching = query.trim().length > 0;

  return (
    <main className="help-page">
      <header className="help-hero">
        <p className="eyebrow">Creator help centre</p>
        <h1>Everything you need to publish on Doerly.</h1>
        <p>
          Step-by-step answers for setting up your profile, adding products, getting through
          review and growing your audience. Updated {CREATOR_HELP_UPDATED}.
        </p>
        <label className="help-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search the help centre</span>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help — e.g. thumbnail, review, tip link"
          />
        </label>
      </header>

      {!searching && (
        <section className="help-quickstart" aria-labelledby="quickstart-title">
          <h2 id="quickstart-title">Your first product in five steps</h2>
          <ol>
            {quickStart.map((step, index) => (
              <li key={step.title}>
                <span className="help-step-number">{String(index + 1).padStart(2, "0")}</span>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="help-quickstart-actions">
            <Link to="/dashboard/products/new" className="help-primary-link">
              Add a product <ArrowRight aria-hidden="true" />
            </Link>
            <Link to="/dashboard">Go to your dashboard</Link>
          </div>
        </section>
      )}

      <div className="help-layout">
        <nav className="help-toc" aria-label="Help topics">
          <p className="eyebrow">Topics</p>
          <ol>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
            {faqs.length > 0 && (
              <li>
                <a href="#faq">Frequently asked questions</a>
              </li>
            )}
            <li>
              <a href="#contact">Contact support</a>
            </li>
          </ol>
        </nav>

        <div className="help-content">
          {searching && (
            <p className="help-results" role="status">
              {sections.length + faqs.length === 0
                ? `No help topics match “${query.trim()}”. Try a shorter word, or email us below.`
                : `${sections.length} topic${sections.length === 1 ? "" : "s"} and ${faqs.length} question${faqs.length === 1 ? "" : "s"} match “${query.trim()}”.`}
            </p>
          )}

          {sections.map((section) => (
            <section key={section.id} id={section.id} className="help-section">
              <h2>{section.title}</h2>
              <p className="help-section-summary">{section.summary}</p>
              {section.blocks.map((block, index) => (
                <Block key={`${section.id}-${index}`} block={block} />
              ))}
            </section>
          ))}

          {faqs.length > 0 && (
            <section id="faq" className="help-section">
              <h2>Frequently asked questions</h2>
              <div className="help-faq">
                {faqs.map((faq) => (
                  <details key={faq.question} open={searching}>
                    <summary>{faq.question}</summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          <section id="contact" className="help-section help-contact">
            <h2>Still stuck? Contact support</h2>
            <p>
              Email us with your account email, the product name and what you were trying to do.
              A screenshot of any error message helps us fix things faster. We reply within 2
              working days.
            </p>
            <p className="help-link">
              <a href={`mailto:${creatorSupportEmail}?subject=Creator%20help`}>
                <Mail aria-hidden="true" /> {creatorSupportEmail}
              </a>
            </p>
            <p className="help-related">
              Related: <Link to="/creator-rules">Creator Content Rules</Link> ·{" "}
              <Link to="/terms">Terms of Use</Link> · <Link to="/privacy">Privacy Notice</Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
