-- Product thumbnails, wider product formats, creator tip links and dashboard stats
ALTER TABLE public.guide_versions ADD COLUMN thumbnail_path text;
ALTER TABLE public.guides ADD COLUMN thumbnail_path text;
GRANT INSERT (thumbnail_path), UPDATE (thumbnail_path) ON public.guide_versions TO authenticated;

ALTER TABLE public.profiles ADD COLUMN coffee_url text NOT NULL DEFAULT ''
  CHECK (coffee_url = '' OR (coffee_url ~* '^https://[^[:space:]]+$' AND length(coffee_url) <= 300));

ALTER TABLE public.guides DROP CONSTRAINT guides_format_check;
ALTER TABLE public.guides ADD CONSTRAINT guides_format_check CHECK (format IN (
  'Guide', 'Playbook', 'Toolkit', 'Template', 'Checklist', 'Spreadsheet / calculator', 'Ebook',
  'Video', 'Audio', 'Image pack', 'Course', 'Other'));
ALTER TABLE public.guide_versions DROP CONSTRAINT guide_versions_format_check;
ALTER TABLE public.guide_versions ADD CONSTRAINT guide_versions_format_check CHECK (format IN (
  'Guide', 'Playbook', 'Toolkit', 'Template', 'Checklist', 'Spreadsheet / calculator', 'Ebook',
  'Video', 'Audio', 'Image pack', 'Course', 'Other'));

-- Thumbnail storage: creators manage their own folder, admins see all, anyone sees live product thumbnails
CREATE POLICY "Creators upload own thumbnails" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-thumbnails' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "Creators update own thumbnails" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-thumbnails' AND split_part(name, '/', 1) = auth.uid()::text)
  WITH CHECK (bucket_id = 'product-thumbnails' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "Creators delete own thumbnails" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-thumbnails' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "Creators read own thumbnails" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-thumbnails' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "Admins read all thumbnails" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-thumbnails' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Live product thumbnails are viewable" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-thumbnails' AND EXISTS (
    SELECT 1 FROM public.guides g
    WHERE g.thumbnail_path = storage.objects.name AND g.status = 'published' AND g.published_version_id IS NOT NULL));

-- Simpler submission requirements matching the creator product form
CREATE OR REPLACE FUNCTION public.submit_guide_version(p_version_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v public.guide_versions%ROWTYPE;
  p public.profiles%ROWTYPE;
  c public.categories%ROWTYPE;
  missing text[] := '{}';
BEGIN
  SELECT * INTO v FROM public.guide_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND OR v.creator_id <> auth.uid() THEN RAISE EXCEPTION 'Product draft not found.'; END IF;
  IF v.state NOT IN ('draft', 'changes_requested') THEN RAISE EXCEPTION 'Only drafts can be submitted for review.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Verify your email before submitting a product.';
  END IF;
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND OR p.display_name = 'New member' OR length(trim(p.bio)) = 0 THEN
    RAISE EXCEPTION 'Complete your creator profile before submitting.';
  END IF;
  SELECT * INTO c FROM public.categories WHERE name = v.category;
  IF NOT FOUND OR NOT c.is_active THEN missing := missing || 'an active category'; END IF;
  IF length(trim(v.title)) < 5 THEN missing := missing || 'a product name (5+ characters)'; END IF;
  IF length(trim(v.summary)) < 10 THEN missing := missing || 'an overview (10+ characters)'; END IF;
  IF length(trim(v.description)) < 20 THEN missing := missing || 'a description (20+ characters)'; END IF;
  IF length(trim(v.outcomes)) < 5 THEN missing := missing || 'what buyers will gain'; END IF;
  IF v.access_format IN ('download', 'both') AND v.file_path IS NULL THEN missing := missing || 'the product file'; END IF;
  IF v.access_format IN ('reference', 'both') AND length(trim(v.reference_content)) < 50 THEN missing := missing || 'reference page content'; END IF;
  IF v.file_path IS NOT NULL AND COALESCE(v.file_mime, '') NOT IN (
    'application/pdf', 'application/epub+zip', 'text/csv', 'text/plain',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', 'application/x-zip-compressed',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav',
    'image/png', 'image/jpeg', 'image/webp', 'image/gif'
  ) THEN missing := missing || 'a supported file type'; END IF;
  IF v.ai_assistance IN ('drafting', 'substantial') AND length(trim(v.ai_disclosure)) < 10 THEN missing := missing || 'AI assistance disclosure'; END IF;
  IF (v.risk_sensitive OR COALESCE(c.risk_sensitive, false)) AND length(trim(v.sources_note)) < 10 THEN missing := missing || 'sources, dates and cautions'; END IF;
  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'Add % before submitting.', array_to_string(missing, ', ');
  END IF;

  UPDATE public.guide_versions
  SET state = 'in_review', submitted_at = now(), rights_confirmed_at = now(), accuracy_confirmed_at = now(),
      reviewed_at = NULL, reviewed_by = NULL, review_reason = NULL
  WHERE id = p_version_id;

  PERFORM public.write_audit('version.submitted', 'guide_version', p_version_id, jsonb_build_object('guide_id', v.guide_id, 'version', v.version_number));
  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT r.user_id, 'Product submitted for review', v.title, '/admin?tab=review' FROM public.user_roles r WHERE r.role = 'admin';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.submit_guide_version(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_guide_version(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_guide_revision(p_guide_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  live public.guide_versions%ROWTYPE;
  g public.guides%ROWTYPE;
  new_id uuid;
BEGIN
  SELECT * INTO g FROM public.guides WHERE id = p_guide_id;
  IF NOT FOUND OR g.creator_id <> auth.uid() THEN RAISE EXCEPTION 'Resource not found.'; END IF;
  SELECT * INTO live FROM public.guide_versions
  WHERE guide_id = p_guide_id ORDER BY version_number DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resource has no versions yet.'; END IF;
  INSERT INTO public.guide_versions (
    guide_id, creator_id, title, summary, description, audience, outcomes, contents, limitations, how_to_use,
    preview_text, sources_note, tags, category, format, access_format, reading_time_minutes, price_cents,
    team_price_cents, currency_code, ai_assistance, ai_disclosure, risk_sensitive, reference_content,
    file_path, file_name, file_size_bytes, file_mime, thumbnail_path
  ) VALUES (
    live.guide_id, live.creator_id, live.title, live.summary, live.description, live.audience, live.outcomes,
    live.contents, live.limitations, live.how_to_use, live.preview_text, live.sources_note, live.tags, live.category,
    live.format, live.access_format, live.reading_time_minutes, live.price_cents, live.team_price_cents,
    live.currency_code, live.ai_assistance, live.ai_disclosure, live.risk_sensitive, live.reference_content,
    live.file_path, live.file_name, live.file_size_bytes, live.file_mime, live.thumbnail_path
  ) RETURNING id INTO new_id;
  PERFORM public.write_audit('version.revision_started', 'guide_version', new_id, jsonb_build_object('guide_id', p_guide_id));
  RETURN new_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.start_guide_revision(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_guide_revision(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_guide_version(
  p_version_id uuid, p_decision text, p_reason text, p_rubric jsonb, p_specialist_reviewed boolean
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v public.guide_versions%ROWTYPE;
  needs_escalation boolean;
  check_key text;
  required_checks text[] := ARRAY['problem_audience', 'practical_value', 'creator_claims', 'evidence_safety', 'listing_fidelity', 'rights_disclosure'];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can review resources.'; END IF;
  IF p_decision NOT IN ('approved', 'changes_requested', 'rejected') THEN RAISE EXCEPTION 'Unknown review decision.'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN RAISE EXCEPTION 'Record a reason for this decision.'; END IF;
  SELECT * INTO v FROM public.guide_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found.'; END IF;
  IF v.state <> 'in_review' THEN RAISE EXCEPTION 'This version is not waiting for review.'; END IF;
  needs_escalation := v.risk_sensitive OR EXISTS (SELECT 1 FROM public.categories c WHERE c.name = v.category AND c.risk_sensitive);

  IF p_decision = 'approved' THEN
    FOREACH check_key IN ARRAY required_checks LOOP
      IF COALESCE((p_rubric ->> check_key)::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'Every quality check must pass before approval.';
      END IF;
    END LOOP;
    IF needs_escalation AND NOT COALESCE(p_specialist_reviewed, false) THEN
      RAISE EXCEPTION 'Risk-sensitive material needs a specialist review before approval.';
    END IF;
    UPDATE public.guide_versions SET state = 'superseded'
    WHERE guide_id = v.guide_id AND state = 'approved' AND id <> v.id;
    UPDATE public.guide_versions
    SET state = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), review_reason = trim(p_reason)
    WHERE id = v.id;
    UPDATE public.guides SET
      title = v.title, summary = v.summary, description = v.description, audience = v.audience,
      outcomes = v.outcomes, contents = v.contents, limitations = v.limitations, how_to_use = v.how_to_use,
      preview_text = v.preview_text, sources_note = v.sources_note, tags = v.tags, category = v.category,
      format = v.format, access_format = v.access_format, reading_time_minutes = v.reading_time_minutes,
      price_cents = v.price_cents, team_price_cents = v.team_price_cents, currency_code = v.currency_code,
      ai_assistance = v.ai_assistance, ai_disclosure = v.ai_disclosure, risk_sensitive = v.risk_sensitive,
      file_path = v.file_path, thumbnail_path = v.thumbnail_path,
      status = CASE WHEN status = 'unlisted' THEN 'unlisted' ELSE 'published' END,
      published_version_id = v.id, published_at = COALESCE(published_at, now()), live_updated_at = now(), updated_at = now()
    WHERE id = v.guide_id;
    PERFORM public.notify_user(v.creator_id, 'Your product was approved', v.title || ' (version ' || v.version_number || ') is now live.', '/dashboard/products');
  ELSE
    UPDATE public.guide_versions
    SET state = p_decision, reviewed_at = now(), reviewed_by = auth.uid(), review_reason = trim(p_reason)
    WHERE id = v.id;
    PERFORM public.notify_user(
      v.creator_id,
      CASE WHEN p_decision = 'changes_requested' THEN 'Changes requested on your product' ELSE 'Your product was not approved' END,
      v.title || ': ' || trim(p_reason), '/dashboard/products'
    );
  END IF;

  INSERT INTO public.guide_reviews (version_id, guide_id, reviewer_id, decision, reason, rubric, escalation_required, specialist_reviewed)
  VALUES (v.id, v.guide_id, auth.uid(), p_decision, trim(p_reason), COALESCE(p_rubric, '{}'::jsonb), needs_escalation, COALESCE(p_specialist_reviewed, false));
  PERFORM public.write_audit('version.' || p_decision, 'guide_version', v.id, jsonb_build_object('guide_id', v.guide_id, 'reason', trim(p_reason)));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.review_guide_version(uuid, text, text, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_guide_version(uuid, text, text, jsonb, boolean) TO authenticated;

-- Per-product numbers for the signed-in creator's analytics
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
    (SELECT count(*) FROM public.access_events a JOIN public.entitlements e ON e.id = a.entitlement_id WHERE e.guide_id = g.id),
    (SELECT count(*) FROM public.resource_feedback f WHERE f.guide_id = g.id AND f.status = 'visible'),
    (SELECT round(avg((f.usefulness + f.clarity + f.listing_accuracy) / 3.0), 1) FROM public.resource_feedback f WHERE f.guide_id = g.id AND f.status = 'visible')
  FROM public.guides g
  WHERE g.creator_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.creator_product_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_product_stats() TO authenticated;