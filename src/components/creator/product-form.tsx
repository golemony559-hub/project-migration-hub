import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileUp, ImagePlus, LoaderCircle, Send, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { slugifyGuideTitle } from "@/lib/marketplace-data";
import {
  PRODUCT_FILE_ACCEPT,
  PRODUCT_FILE_MAX_BYTES,
  PRODUCT_FORMATS,
  THUMBNAIL_ACCEPT,
  THUMBNAIL_MAX_BYTES,
  parseProductPrice,
  resolveProductMime,
  safeStorageName,
} from "@/lib/creator-products";
import { useThumbnailUrls } from "@/hooks/use-thumbnail-urls";
import { normalizeListingTags } from "@/lib/listing-assistant";
import type { ProductAutofillFields } from "@/lib/product-autofill";
import { ProductAutofill } from "./product-autofill";
import { sendSubmissionEmails } from "@/lib/review-emails.functions";

type Version = Tables<"guide_versions">;
type Category = Pick<Tables<"categories">, "name" | "risk_sensitive">;

type Props = {
  userId: string;
  /** Existing editable version; omit to create a new product. */
  version?: Version;
  onDone: (result: { guideId: string; submitted: boolean; message: string }) => void;
  /** Shown as a Cancel button when editing an existing product. */
  onCancel?: () => void;
};

type TextSnapshot = {
  title: string;
  summary: string;
  description: string;
  outcomes: string;
  category: string;
  format: string;
  sourcesNote: string;
  tags: string;
};

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function ProductForm({ userId, version, onDone, onCancel }: Props) {
  const sendEmails = useServerFn(sendSubmissionEmails);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState(version?.title ?? "");
  const [summary, setSummary] = useState(version?.summary ?? "");
  const [description, setDescription] = useState(version?.description ?? "");
  const [outcomes, setOutcomes] = useState(version?.outcomes ?? "");
  const [category, setCategory] = useState(version?.category ?? "");
  const [format, setFormat] = useState(version?.format ?? "Guide");
  const [sourcesNote, setSourcesNote] = useState(version?.sources_note ?? "");
  const [tags, setTags] = useState((version?.tags ?? []).join(", "));
  const [beforeAi, setBeforeAi] = useState<TextSnapshot | null>(null);
  const [pricing, setPricing] = useState<"free" | "paid">(
    version && version.price_cents > 0 ? "paid" : "free",
  );
  const [price, setPrice] = useState(
    version && version.price_cents > 0 ? (version.price_cents / 100).toFixed(2) : "",
  );
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState("");
  const [productFile, setProductFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"" | "save" | "submit">("");
  const [error, setError] = useState("");
  const existingThumb = useThumbnailUrls([version?.thumbnail_path]);

  useEffect(() => {
    void supabase
      .from("categories")
      .select("name, risk_sensitive")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setCategories(data ?? []);
        const first = data?.[0];
        if (!version && first) setCategory((c) => c || first.name);
      });
  }, [version]);

  useEffect(() => {
    if (!thumbFile) return setThumbPreview("");
    const url = URL.createObjectURL(thumbFile);
    setThumbPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbFile]);

  const riskSensitive = categories.find((c) => c.name === category)?.risk_sensitive ?? false;
  const currentThumb =
    thumbPreview || (version?.thumbnail_path ? existingThumb[version.thumbnail_path] : "");

  function applyAi(fields: ProductAutofillFields) {
    setBeforeAi({ title, summary, description, outcomes, category, format, sourcesNote, tags });
    setTitle(fields.title);
    if (fields.summary) setSummary(fields.summary);
    setDescription(fields.description);
    if (fields.outcomes) setOutcomes(fields.outcomes);
    if (fields.category) setCategory(fields.category);
    if (fields.format) setFormat(fields.format);
    if (fields.sourcesNote) setSourcesNote(fields.sourcesNote);
    if (fields.tags.length) setTags(fields.tags.join(", "));
  }

  function undoAi() {
    if (!beforeAi) return;
    setTitle(beforeAi.title);
    setSummary(beforeAi.summary);
    setDescription(beforeAi.description);
    setOutcomes(beforeAi.outcomes);
    setCategory(beforeAi.category);
    setFormat(beforeAi.format);
    setSourcesNote(beforeAi.sourcesNote);
    setTags(beforeAi.tags);
    setBeforeAi(null);
  }

  function pickThumb(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!THUMBNAIL_ACCEPT.split(",").includes(file.type))
      return setError("Thumbnail must be a PNG, JPG or WebP image.");
    if (file.size > THUMBNAIL_MAX_BYTES) return setError("Thumbnail must be 5 MB or smaller.");
    setThumbFile(file);
  }

  function pickFile(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!resolveProductMime(file.name, file.type)) {
      return setError(
        "That file type isn’t supported. Use PDF, Word, Excel, CSV, PowerPoint, EPUB, ZIP, MP4/MOV, MP3 or an image.",
      );
    }
    if (file.size > PRODUCT_FILE_MAX_BYTES) return setError("Files must be 500 MB or smaller.");
    setProductFile(file);
  }

  async function save(submit: boolean) {
    setError("");
    if (title.trim().length < 5)
      return setError("Give your product a name of at least 5 characters.");
    if (summary.trim().length < 10)
      return setError("Write a short overview (at least 10 characters).");
    if (description.trim().length < 20)
      return setError("Write a description (at least 20 characters).");
    if (outcomes.trim().length < 5) return setError("Tell buyers what they will gain.");
    if (!category) return setError("Choose a category.");
    if (riskSensitive && sourcesNote.trim().length < 10) {
      return setError("This category needs sources, dates and cautions (at least 10 characters).");
    }
    if (!productFile && !version?.file_path) return setError("Upload the product file.");
    const priceResult = parseProductPrice(pricing, price);
    if (!priceResult.ok) return setError(priceResult.error);

    setBusy(submit ? "submit" : "save");
    const uploaded: { bucket: string; path: string }[] = [];
    const cleanup = async () => {
      for (const u of uploaded) await supabase.storage.from(u.bucket).remove([u.path]);
    };

    try {
      let thumbnailPath = version?.thumbnail_path ?? null;
      if (thumbFile) {
        const path = `${userId}/${crypto.randomUUID()}-${safeStorageName(thumbFile.name)}`;
        const { error: upErr } = await supabase.storage
          .from("product-thumbnails")
          .upload(path, thumbFile, { contentType: thumbFile.type, upsert: false });
        if (upErr) throw new Error(`Thumbnail upload failed: ${upErr.message}`);
        uploaded.push({ bucket: "product-thumbnails", path });
        thumbnailPath = path;
      }

      let fileFields: Partial<Version> = {};
      if (productFile) {
        const mime = resolveProductMime(productFile.name, productFile.type)!;
        const path = `${userId}/${crypto.randomUUID()}-${safeStorageName(productFile.name)}`;
        const { error: upErr } = await supabase.storage
          .from("creator-guides")
          .upload(path, productFile, { contentType: mime, upsert: false });
        if (upErr) throw new Error(`File upload failed: ${upErr.message}`);
        uploaded.push({ bucket: "creator-guides", path });
        fileFields = {
          file_path: path,
          file_name: productFile.name,
          file_size_bytes: productFile.size,
          file_mime: mime,
        };
      }

      const values = {
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim(),
        outcomes: outcomes.trim(),
        category,
        format,
        sources_note: sourcesNote.trim(),
        tags: normalizeListingTags(tags.split(",")),
        price_cents: priceResult.cents,
        currency_code: "USD",
        access_format: "download",
        thumbnail_path: thumbnailPath,
        ...fileFields,
      };

      let guideId = version?.guide_id ?? "";
      let versionId = version?.id ?? "";
      if (version) {
        const { error: updErr } = await supabase
          .from("guide_versions")
          .update(values)
          .eq("id", version.id);
        if (updErr) throw new Error(updErr.message);
      } else {
        const { data: guide, error: gErr } = await supabase
          .from("guides")
          .insert({
            creator_id: userId,
            slug: `${slugifyGuideTitle(title) || "product"}-${crypto.randomUUID().slice(0, 8)}`,
            title: values.title,
            summary: values.summary,
            description: values.description,
            category,
            format,
            price_cents: values.price_cents,
            currency_code: "USD",
            status: "draft",
          })
          .select("id")
          .single();
        if (gErr) throw new Error(gErr.message);
        guideId = guide.id;
        const { data: v, error: vErr } = await supabase
          .from("guide_versions")
          .insert({ ...values, guide_id: guide.id, creator_id: userId })
          .select("id")
          .single();
        if (vErr) {
          await supabase.from("guides").delete().eq("id", guide.id);
          throw new Error(vErr.message);
        }
        versionId = v.id;
      }
      uploaded.length = 0; // saved: keep files

      if (submit) {
        const { error: subErr } = await supabase.rpc("submit_guide_version", {
          p_version_id: versionId,
        });
        if (subErr) {
          setBusy("");
          return onDone({
            guideId,
            submitted: false,
            message: `Saved as a draft, but not submitted: ${subErr.message}`,
          });
        }
        // Email the admin and the creator; a failed email never undoes the submission.
        void sendEmails({ data: { versionId } }).catch((e: unknown) =>
          console.error("submission emails failed", e),
        );
      }
      setBusy("");
      onDone({
        guideId,
        submitted: submit,
        message: submit
          ? "Submitted! Your product is pending review — we’ll notify you once an admin decides."
          : "Draft saved. Submit it for review when you’re ready.",
      });
    } catch (e) {
      await cleanup();
      setBusy("");
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form
      className="product-form"
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        void save(true);
      }}
    >
      <ProductAutofill
        versionId={version?.id}
        current={{ title, summary, description, outcomes, category, format, sourcesNote }}
        onFill={applyAi}
        onUndo={undoAi}
        canUndo={beforeAi !== null}
      />

      <section className="dash-section product-form-section">
        <h2>Basics</h2>
        <label className="studio-field">
          Product name
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
            placeholder="e.g. Healthy chicks: your first eight weeks"
          />
        </label>
        <label className="studio-field">
          Overview / summary
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            maxLength={300}
            required
            placeholder="One or two sentences on the problem this solves."
          />
          <span className="field-hint">
            Shown on product cards and at the top of your product page.
          </span>
        </label>
        <label className="studio-field">
          Description
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            maxLength={5000}
            required
            placeholder="Explain what this is, who it helps and what’s inside."
          />
        </label>
        <label className="studio-field">
          What buyers / readers will gain
          <Textarea
            value={outcomes}
            onChange={(e) => setOutcomes(e.target.value)}
            rows={4}
            maxLength={2000}
            required
            placeholder={"One per line, e.g.\nSet up a safe brooder\nSpot early signs of illness"}
          />
          <span className="field-hint">
            Tip: put each benefit on its own line — they’re shown as a list.
          </span>
        </label>
        <div className="product-form-row">
          <label className="studio-field">
            Category
            <select
              className="app-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="studio-field">
            Type
            <select
              className="app-select"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              {PRODUCT_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
        </div>
        {riskSensitive && (
          <label className="studio-field">
            Sources, dates & cautions
            <Textarea
              value={sourcesNote}
              onChange={(e) => setSourcesNote(e.target.value)}
              rows={3}
              placeholder="Where your information comes from, when it was last checked, and any cautions."
            />
            <span className="field-hint">Required for this category.</span>
          </label>
        )}
        <label className="studio-field">
          Search tags <span className="field-hint">(optional)</span>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            maxLength={300}
            placeholder="e.g. chickens, brooder, poultry health"
          />
          <span className="field-hint">Separate tags with commas. Up to 8.</span>
        </label>
      </section>

      <section className="dash-section product-form-section">
        <h2>Pricing</h2>
        <div className="pricing-toggle" role="radiogroup" aria-label="Pricing">
          {(["free", "paid"] as const).map((option) => (
            <label
              key={option}
              className={`pricing-option ${pricing === option ? "is-selected" : ""}`}
            >
              <input
                type="radio"
                name="pricing"
                value={option}
                checked={pricing === option}
                onChange={() => setPricing(option)}
              />
              <span>
                <strong>{option === "free" ? "Free" : "Paid"}</strong>
                <small>
                  {option === "free"
                    ? "Anyone can get it. Readers can buy you a coffee."
                    : "Set your price in US dollars."}
                </small>
              </span>
            </label>
          ))}
        </div>
        {pricing === "paid" && (
          <label className="studio-field price-field">
            Price (USD)
            <Input
              type="number"
              inputMode="decimal"
              min="1"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="9.99"
              required
            />
            <span className="field-hint">
              Paid checkout is coming soon — your price is saved and shown on your page.
            </span>
          </label>
        )}
      </section>

      <section className="dash-section product-form-section">
        <h2>Media & file</h2>
        <div className="upload-grid">
          <div className="upload-box">
            <span className="upload-label">Thumbnail</span>
            {currentThumb ? (
              <img className="upload-thumb-preview" src={currentThumb} alt="Thumbnail preview" />
            ) : (
              <span className="upload-thumb-preview is-empty">
                <ImagePlus aria-hidden="true" />
              </span>
            )}
            <label className="upload-button">
              <input
                type="file"
                accept={THUMBNAIL_ACCEPT}
                onChange={(e) => pickThumb(e.target.files?.[0])}
              />
              <ImagePlus aria-hidden="true" />{" "}
              {currentThumb ? "Change thumbnail" : "Upload thumbnail"}
            </label>
            <small>PNG, JPG or WebP, up to 5 MB. Square or 4:3 works best.</small>
          </div>
          <div className="upload-box">
            <span className="upload-label">Product file</span>
            <div className="upload-file-name">
              {productFile
                ? `${productFile.name} · ${formatBytes(productFile.size)}`
                : version?.file_name
                  ? `${version.file_name}${version.file_size_bytes ? ` · ${formatBytes(version.file_size_bytes)}` : ""}`
                  : "No file yet"}
            </div>
            <label className="upload-button">
              <input
                type="file"
                accept={PRODUCT_FILE_ACCEPT}
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              <FileUp aria-hidden="true" />{" "}
              {productFile || version?.file_name ? "Replace file" : "Upload file"}
            </label>
            <small>
              PDF, Word, Excel, CSV, PowerPoint, EPUB, ZIP, MP4/MOV video, MP3 audio or images. Up
              to 500 MB. Kept private until someone gets it.
            </small>
          </div>
        </div>
      </section>

      {error && (
        <p className="studio-feedback is-error" role="alert">
          {error}
        </p>
      )}
      <div className="product-form-actions">
        {onCancel && (
          <Button type="button" variant="ghost" disabled={busy !== ""} onClick={onCancel}>
            <X aria-hidden="true" /> Cancel
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={busy !== ""}
          onClick={() => void save(false)}
        >
          {busy === "save" ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Save aria-hidden="true" />
          )}{" "}
          Save as draft
        </Button>
        <Button type="submit" disabled={busy !== ""}>
          {busy === "submit" ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Send aria-hidden="true" />
          )}
          {busy ? "Uploading & saving…" : "Submit for review"}
        </Button>
      </div>
      {busy && productFile && productFile.size > 20 * 1024 * 1024 && (
        <p className="field-hint">
          Large files can take a few minutes to upload. Keep this page open.
        </p>
      )}
    </form>
  );
}
