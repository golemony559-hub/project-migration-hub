import { createFileRoute } from "@tanstack/react-router";
import { PolicyDocumentPage } from "@/components/policy-document-page";

const description =
  "Draft Terms of Use for Doerly: accounts, creator materials, buyer access, payments, and limitations.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use (draft) | Doerly" },
      { name: "description", content: description },
      { property: "og:title", content: "Terms of Use (draft) | Doerly" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PolicyDocumentPage policyId="terms" />,
});
