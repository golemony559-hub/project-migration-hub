import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCreator } from "@/components/creator/creator-context";
import { ProductForm } from "@/components/creator/product-form";
import { DashHeading } from "@/components/creator/product-bits";

export const Route = createFileRoute("/dashboard/products/new")({
  head: () => ({
    meta: [
      { title: "Add a product | Creator dashboard | Doerly" },
      { name: "description", content: "Upload a new product and send it for review." },
      { property: "og:title", content: "Add a product | Creator dashboard | Doerly" },
      { property: "og:description", content: "Upload a new product and send it for review." },
    ],
  }),
  component: NewProductPage,
});

function NewProductPage() {
  const { user } = useCreator();
  const navigate = useNavigate();
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="dash-back">
        <Link to="/dashboard/products">
          <ArrowLeft aria-hidden="true" /> Products
        </Link>
      </Button>
      <DashHeading eyebrow="New product" title="Add a product" />
      <p className="dash-intro">
        Fill in the details yourself or let AI fill them in from your notes, then add a thumbnail
        and upload your file. When you submit, your product is
        marked <strong>Pending review</strong>. Once an admin approves it, it goes live on the
        marketplace.
      </p>
      <ProductForm
        userId={user.id}
        onDone={({ guideId, submitted, message }) => {
          if (submitted) toast.success(message);
          else toast(message);
          void navigate({ to: "/dashboard/products/$guideId", params: { guideId } });
        }}
      />
    </>
  );
}
