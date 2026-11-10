import { createFileRoute } from "@tanstack/react-router";
import { PolicyDocumentPage } from "@/components/policy-document-page";

const description =
  "Draft Creator Content Rules for Doerly: rights, accurate listings, safe use, and buyer support.";

export const Route = createFileRoute("/creator-rules")({
  head: () => ({
    meta: [
      { title: "Creator Content Rules (draft) | Doerly" },
      { name: "description", content: description },
      { property: "og:title", content: "Creator Content Rules (draft) | Doerly" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PolicyDocumentPage policyId="creator-rules" />,
});
