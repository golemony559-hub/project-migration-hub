-- Buyers can get a resource with just a name and email: orders may belong to a guest email.
ALTER TABLE public.orders ALTER COLUMN buyer_id DROP NOT NULL;
ALTER TABLE public.orders
  ADD COLUMN buyer_email text,
  ADD COLUMN buyer_name text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD CONSTRAINT orders_buyer_present CHECK (buyer_id IS NOT NULL OR buyer_email IS NOT NULL);
CREATE UNIQUE INDEX orders_one_free_per_email_version ON public.orders (lower(buyer_email), version_id)
  WHERE status = 'free' AND buyer_email IS NOT NULL;

-- When a product was downloaded for the first time (drives the creator's "first download" notice).
ALTER TABLE public.guides ADD COLUMN first_downloaded_at timestamptz;

-- Emailed download links. Only the hash of the secret token is stored; server code only.
CREATE TABLE public.download_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.guide_versions(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text NOT NULL DEFAULT '',
  expires_at timestamptz,
  max_downloads integer NOT NULL DEFAULT 20 CHECK (max_downloads > 0),
  download_count integer NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  first_downloaded_at timestamptz,
  last_downloaded_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.download_links TO service_role;
ALTER TABLE public.download_links ENABLE ROW LEVEL SECURITY;
CREATE INDEX download_links_email_idx ON public.download_links (lower(recipient_email), created_at DESC);
CREATE INDEX download_links_guide_idx ON public.download_links (guide_id);

-- Marks a product's first-ever download once and leaves the creator an in-app notice.
CREATE OR REPLACE FUNCTION public.mark_guide_first_download(p_guide_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g public.guides%ROWTYPE;
BEGIN
  UPDATE public.guides SET first_downloaded_at = now()
  WHERE id = p_guide_id AND first_downloaded_at IS NULL
  RETURNING * INTO g;
  IF NOT FOUND THEN RETURN false; END IF;
  PERFORM public.notify_user(g.creator_id, 'Your first download!',
    format('Someone just downloaded “%s” for the first time.', g.title), '/dashboard/products/' || g.id);
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.mark_guide_first_download(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_guide_first_download(uuid) TO service_role;

-- Records a free claim for a name + email and creates the emailed link.
CREATE OR REPLACE FUNCTION public.issue_free_download(
  p_guide_id uuid, p_name text, p_email text, p_buyer_id uuid, p_token_hash text, p_expires_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g public.guides%ROWTYPE;
  v public.guide_versions%ROWTYPE;
  o public.orders%ROWTYPE;
  new_link uuid;
  recent integer;
  email text := lower(trim(p_email));
BEGIN
  IF email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(email) > 255 THEN RAISE EXCEPTION 'Please enter a valid email address.'; END IF;
  IF length(trim(coalesce(p_name, ''))) = 0 OR length(p_name) > 100 THEN RAISE EXCEPTION 'Please enter your name.'; END IF;
  SELECT * INTO g FROM public.guides WHERE id = p_guide_id;
  IF NOT FOUND OR g.status <> 'published' OR g.published_version_id IS NULL THEN RAISE EXCEPTION 'This resource is not available.'; END IF;
  SELECT * INTO v FROM public.guide_versions WHERE id = g.published_version_id;
  IF v.price_cents <> 0 THEN RAISE EXCEPTION 'This resource is paid. Paid checkout is not available yet.'; END IF;
  IF v.file_path IS NULL THEN RAISE EXCEPTION 'This resource has no file to download.'; END IF;

  SELECT count(*) INTO recent FROM public.download_links
  WHERE lower(recipient_email) = email AND guide_id = g.id AND created_at > now() - interval '1 minute';
  IF recent > 0 THEN RAISE EXCEPTION 'We just emailed you this link. Please check your inbox (and spam folder).'; END IF;
  SELECT count(*) INTO recent FROM public.download_links
  WHERE lower(recipient_email) = email AND created_at > now() - interval '1 hour';
  IF recent >= 5 THEN RAISE EXCEPTION 'Too many requests for this email. Please try again in an hour.'; END IF;

  IF p_buyer_id IS NOT NULL THEN
    SELECT * INTO o FROM public.orders
    WHERE buyer_id = p_buyer_id AND version_id = v.id AND status = 'free' ORDER BY created_at LIMIT 1;
  END IF;
  IF o.id IS NULL THEN
    SELECT * INTO o FROM public.orders
    WHERE lower(buyer_email) = email AND version_id = v.id AND status = 'free' LIMIT 1;
  END IF;

  IF o.id IS NULL THEN
    INSERT INTO public.orders (buyer_id, buyer_email, buyer_name, guide_id, version_id, creator_id, license_type, status, amount_cents, currency_code, paid_at)
    VALUES (p_buyer_id, email, trim(p_name), g.id, v.id, g.creator_id, 'personal', 'free', 0, v.currency_code, now())
    RETURNING * INTO o;
    PERFORM public.write_audit('order.free_claimed', 'order', o.id, jsonb_build_object('guide_id', g.id, 'version_id', v.id, 'by_email', true));
  ELSE
    UPDATE public.orders SET
      buyer_id = COALESCE(buyer_id, p_buyer_id),
      buyer_email = COALESCE(buyer_email, email),
      buyer_name = CASE WHEN buyer_name = '' THEN trim(p_name) ELSE buyer_name END
    WHERE id = o.id RETURNING * INTO o;
  END IF;

  IF o.buyer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.entitlements WHERE order_id = o.id) THEN
    INSERT INTO public.entitlements (buyer_id, guide_id, version_id, order_id, license_type)
    VALUES (o.buyer_id, g.id, v.id, o.id, 'personal');
  END IF;

  INSERT INTO public.download_links (token_hash, order_id, guide_id, version_id, creator_id, recipient_email, recipient_name, expires_at)
  VALUES (p_token_hash, o.id, g.id, v.id, g.creator_id, email, trim(p_name), p_expires_at)
  RETURNING id INTO new_link;

  RETURN jsonb_build_object('link_id', new_link, 'order_id', o.id, 'title', v.title, 'expires_at', p_expires_at);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.issue_free_download(uuid, text, text, uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_free_download(uuid, text, text, uuid, text, timestamptz) TO service_role;

-- Creates the emailed link for a paid order (called once payment is confirmed).
CREATE OR REPLACE FUNCTION public.issue_paid_download(p_order_id uuid, p_token_hash text, p_expires_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o public.orders%ROWTYPE;
  v public.guide_versions%ROWTYPE;
  new_link uuid;
  email text;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND OR o.status <> 'paid' THEN RAISE EXCEPTION 'This order is not paid.'; END IF;
  SELECT * INTO v FROM public.guide_versions WHERE id = o.version_id;
  email := COALESCE(o.buyer_email, (SELECT u.email FROM auth.users u WHERE u.id = o.buyer_id));
  IF email IS NULL THEN RAISE EXCEPTION 'This order has no email address.'; END IF;
  INSERT INTO public.download_links (token_hash, order_id, guide_id, version_id, creator_id, recipient_email, recipient_name, expires_at)
  VALUES (p_token_hash, o.id, o.guide_id, o.version_id, o.creator_id, lower(email), o.buyer_name, p_expires_at)
  RETURNING id INTO new_link;
  RETURN jsonb_build_object('link_id', new_link, 'order_id', o.id, 'title', v.title, 'expires_at', p_expires_at, 'email', lower(email), 'name', o.buyer_name);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.issue_paid_download(uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_paid_download(uuid, text, timestamptz) TO service_role;

-- Uses one download from an emailed link, if it is still valid.
CREATE OR REPLACE FUNCTION public.consume_download_link(p_token_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l public.download_links%ROWTYPE;
  o public.orders%ROWTYPE;
  v public.guide_versions%ROWTYPE;
  g public.guides%ROWTYPE;
  first_for_guide boolean := false;
BEGIN
  SELECT * INTO l FROM public.download_links WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('outcome', 'not_found'); END IF;
  IF l.expires_at IS NOT NULL AND l.expires_at <= now() THEN RETURN jsonb_build_object('outcome', 'expired', 'guide_id', l.guide_id); END IF;
  IF l.download_count >= l.max_downloads THEN RETURN jsonb_build_object('outcome', 'limit', 'guide_id', l.guide_id); END IF;
  SELECT * INTO o FROM public.orders WHERE id = l.order_id;
  IF o.status NOT IN ('free', 'paid') THEN RETURN jsonb_build_object('outcome', 'unavailable', 'guide_id', l.guide_id); END IF;
  SELECT * INTO v FROM public.guide_versions WHERE id = l.version_id;
  IF v.file_path IS NULL THEN RETURN jsonb_build_object('outcome', 'unavailable', 'guide_id', l.guide_id); END IF;

  UPDATE public.download_links SET
    download_count = download_count + 1,
    first_downloaded_at = COALESCE(first_downloaded_at, now()),
    last_downloaded_at = now()
  WHERE id = l.id;
  first_for_guide := public.mark_guide_first_download(l.guide_id);
  SELECT * INTO g FROM public.guides WHERE id = l.guide_id;

  RETURN jsonb_build_object(
    'outcome', 'ok', 'file_path', v.file_path, 'file_name', v.file_name, 'guide_id', l.guide_id,
    'title', v.title, 'creator_id', g.creator_id, 'first_for_guide', first_for_guide
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.consume_download_link(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_download_link(text) TO service_role;

-- Per-product numbers now include downloads from emailed links.
CREATE OR REPLACE FUNCTION public.creator_product_stats()
RETURNS TABLE (
  guide_id uuid, claims bigint, paid_orders bigint, revenue_cents bigint,
  downloads bigint, feedback_count bigint, avg_rating numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    g.id,
    (SELECT count(*) FROM public.orders o WHERE o.guide_id = g.id AND o.status = 'free'),
    (SELECT count(*) FROM public.orders o WHERE o.guide_id = g.id AND o.status = 'paid'),
    (SELECT COALESCE(sum(o.amount_cents), 0) FROM public.orders o WHERE o.guide_id = g.id AND o.status = 'paid'),
    (SELECT count(*) FROM public.access_events a JOIN public.entitlements e ON e.id = a.entitlement_id WHERE e.guide_id = g.id AND a.kind = 'download')
      + (SELECT COALESCE(sum(l.download_count), 0) FROM public.download_links l WHERE l.guide_id = g.id),
    (SELECT count(*) FROM public.resource_feedback f WHERE f.guide_id = g.id AND f.status = 'visible'),
    (SELECT round(avg((f.usefulness + f.clarity + f.listing_accuracy) / 3.0), 1) FROM public.resource_feedback f WHERE f.guide_id = g.id AND f.status = 'visible')
  FROM public.guides g
  WHERE g.creator_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.creator_product_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_product_stats() TO authenticated;