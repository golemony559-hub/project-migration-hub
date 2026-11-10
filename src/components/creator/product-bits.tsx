import { ImageIcon } from "lucide-react";
import type { ProductStatusTone } from "@/lib/creator-products";

export function StatusBadge({ label, tone }: { label: string; tone: ProductStatusTone }) {
  return <span className={`status-badge is-${tone}`}>{label}</span>;
}

export function ProductThumb({
  url,
  title,
  size = "md",
}: {
  url?: string | undefined;
  title: string;
  size?: "sm" | "md" | "lg";
}) {
  return url ? (
    <img className={`product-thumb is-${size}`} src={url} alt={`Thumbnail for ${title}`} />
  ) : (
    <span className={`product-thumb is-${size} is-empty`} aria-hidden="true">
      <ImageIcon />
    </span>
  );
}

export function DashHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="dash-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {children && <div className="dash-heading-actions">{children}</div>}
    </header>
  );
}
