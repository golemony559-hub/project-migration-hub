import { createFileRoute } from "@tanstack/react-router";
import { PolicyDocumentPage } from "@/components/policy-document-page";

const description =
  "Draft Privacy Notice for Doerly: what information is used, what is public, and what is still being confirmed.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Notice (draft) | Doerly" },
      { name: "description", content: description },
      { property: "og:title", content: "Privacy Notice (draft) | Doerly" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PolicyDocumentPage policyId="privacy" />,
});
