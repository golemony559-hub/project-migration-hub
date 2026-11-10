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
  PERFORM public.notify_user(
    v.creator_id,
    'We received your product',
    v.title || ' is now pending review. We will let you know once an admin decides.',
    '/dashboard/products/' || v.guide_id::text
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.submit_guide_version(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_guide_version(uuid) TO authenticated;