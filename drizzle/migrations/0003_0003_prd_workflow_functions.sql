-- ===== Workflow functions =====
CREATE OR REPLACE FUNCTION public.submit_guide_version(p_version_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v public.guide_versions%ROWTYPE;
  p public.profiles%ROWTYPE;
  c public.categories%ROWTYPE;
  missing text[] := '{}';
BEGIN
  SELECT * INTO v FROM public.guide_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND OR v.creator_id <> auth.uid() THEN RAISE EXCEPTION 'Resource draft not found.'; END IF;
  IF v.state NOT IN ('draft', 'changes_requested') THEN RAISE EXCEPTION 'Only drafts can be submitted for review.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Verify your email before submitting a resource.';
  END IF;
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND OR p.display_name = 'New member' OR length(trim(p.bio)) = 0 THEN
    RAISE EXCEPTION 'Complete your creator profile before submitting.';
  END IF;
  SELECT * INTO c FROM public.categories WHERE name = v.category;
  IF NOT FOUND OR NOT c.is_active THEN missing := missing || 'an active category'; END IF;
  IF length(trim(v.title)) < 5 THEN missing := missing || 'title'; END IF;
  IF length(trim(v.summary)) < 10 THEN missing := missing || 'problem it solves'; END IF;
  IF length(trim(v.audience)) < 5 THEN missing := missing || 'who it is for'; END IF;
  IF length(trim(v.outcomes)) < 5 THEN missing := missing || 'what buyers will be able to do'; END IF;
  IF length(trim(v.contents)) < 5 THEN missing := missing || 'what is included'; END IF;
  IF length(trim(v.limitations)) < 5 THEN missing := missing || 'prerequisites and limitations'; END IF;
  IF length(trim(v.how_to_use)) < 5 THEN missing := missing || 'how to use it'; END IF;
  IF length(trim(v.preview_text)) < 20 THEN missing := missing || 'preview or sample'; END IF;
  IF v.access_format IN ('download', 'both') AND v.file_path IS NULL THEN missing := missing || 'resource file'; END IF;
  IF v.access_format IN ('reference', 'both') AND length(trim(v.reference_content)) < 50 THEN missing := missing || 'reference page content'; END IF;
  IF v.file_path IS NOT NULL AND COALESCE(v.file_mime, '') NOT IN (
    'application/pdf', 'application/epub+zip', 'text/csv', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) THEN missing := missing || 'a supported file type (PDF, DOCX, EPUB, XLSX or CSV)'; END IF;
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
  SELECT r.user_id, 'Resource submitted for review', v.title, '/admin?tab=review' FROM public.user_roles r WHERE r.role = 'admin';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.submit_guide_version(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_guide_version(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.withdraw_guide_version(p_version_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.guide_versions%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.guide_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND OR v.creator_id <> auth.uid() THEN RAISE EXCEPTION 'Resource draft not found.'; END IF;
  IF v.state <> 'in_review' THEN RAISE EXCEPTION 'Only a submission in review can be withdrawn.'; END IF;
  UPDATE public.guide_versions SET state = 'draft', submitted_at = NULL WHERE id = p_version_id;
  PERFORM public.write_audit('version.withdrawn', 'guide_version', p_version_id, '{}'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.withdraw_guide_version(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_guide_version(uuid) TO authenticated;

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
    file_path, file_name, file_size_bytes, file_mime
  ) VALUES (
    live.guide_id, live.creator_id, live.title, live.summary, live.description, live.audience, live.outcomes,
    live.contents, live.limitations, live.how_to_use, live.preview_text, live.sources_note, live.tags, live.category,
    live.format, live.access_format, live.reading_time_minutes, live.price_cents, live.team_price_cents,
    live.currency_code, live.ai_assistance, live.ai_disclosure, live.risk_sensitive, live.reference_content,
    live.file_path, live.file_name, live.file_size_bytes, live.file_mime
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
      status = CASE WHEN status = 'unlisted' THEN 'unlisted' ELSE 'published' END,
      published_version_id = v.id, published_at = COALESCE(published_at, now()), live_updated_at = now(), updated_at = now()
    WHERE id = v.guide_id;
    PERFORM public.notify_user(v.creator_id, 'Your resource was approved', v.title || ' (version ' || v.version_number || ') is now live.', '/creator');
  ELSE
    UPDATE public.guide_versions
    SET state = p_decision, reviewed_at = now(), reviewed_by = auth.uid(), review_reason = trim(p_reason)
    WHERE id = v.id;
    PERFORM public.notify_user(
      v.creator_id,
      CASE WHEN p_decision = 'changes_requested' THEN 'Changes requested on your resource' ELSE 'Your resource was not approved' END,
      v.title || ': ' || trim(p_reason), '/creator'
    );
  END IF;

  INSERT INTO public.guide_reviews (version_id, guide_id, reviewer_id, decision, reason, rubric, escalation_required, specialist_reviewed)
  VALUES (v.id, v.guide_id, auth.uid(), p_decision, trim(p_reason), COALESCE(p_rubric, '{}'::jsonb), needs_escalation, COALESCE(p_specialist_reviewed, false));
  PERFORM public.write_audit('version.' || p_decision, 'guide_version', v.id, jsonb_build_object('guide_id', v.guide_id, 'reason', trim(p_reason)));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.review_guide_version(uuid, text, text, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_guide_version(uuid, text, text, jsonb, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_guide_listing(p_guide_id uuid, p_listed boolean, p_reason text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.guides%ROWTYPE; is_admin boolean := public.has_role(auth.uid(), 'admin');
BEGIN
  SELECT * INTO g FROM public.guides WHERE id = p_guide_id FOR UPDATE;
  IF NOT FOUND OR (g.creator_id <> auth.uid() AND NOT is_admin) THEN RAISE EXCEPTION 'Resource not found.'; END IF;
  IF g.published_version_id IS NULL THEN RAISE EXCEPTION 'Only approved resources can be listed or unlisted.'; END IF;
  IF g.creator_id <> auth.uid() AND length(trim(COALESCE(p_reason, ''))) < 5 THEN RAISE EXCEPTION 'Record a reason for this change.'; END IF;
  UPDATE public.guides SET status = CASE WHEN p_listed THEN 'published' ELSE 'unlisted' END, updated_at = now() WHERE id = p_guide_id;
  PERFORM public.write_audit(CASE WHEN p_listed THEN 'guide.listed' ELSE 'guide.unlisted' END, 'guide', p_guide_id, jsonb_build_object('reason', COALESCE(p_reason, ''), 'by_admin', g.creator_id <> auth.uid()));
  IF g.creator_id <> auth.uid() THEN
    PERFORM public.notify_user(g.creator_id, CASE WHEN p_listed THEN 'Your resource was relisted' ELSE 'Your resource was unlisted by Doerly' END, g.title || ': ' || COALESCE(p_reason, ''), '/creator');
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_guide_listing(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_guide_listing(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_free_resource(p_guide_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g public.guides%ROWTYPE;
  v public.guide_versions%ROWTYPE;
  existing uuid;
  new_order uuid;
  new_entitlement uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to get this resource.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Verify your email to get this resource.';
  END IF;
  SELECT * INTO g FROM public.guides WHERE id = p_guide_id;
  IF NOT FOUND OR g.status <> 'published' OR g.published_version_id IS NULL THEN RAISE EXCEPTION 'This resource is not available.'; END IF;
  SELECT * INTO v FROM public.guide_versions WHERE id = g.published_version_id;
  IF v.price_cents <> 0 THEN RAISE EXCEPTION 'This resource is paid. Paid checkout is not available yet.'; END IF;
  SELECT e.id INTO existing FROM public.entitlements e
  WHERE e.buyer_id = auth.uid() AND e.version_id = v.id AND e.revoked_at IS NULL LIMIT 1;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  INSERT INTO public.orders (buyer_id, guide_id, version_id, creator_id, license_type, status, amount_cents, currency_code, paid_at)
  VALUES (auth.uid(), g.id, v.id, g.creator_id, 'personal', 'free', 0, v.currency_code, now())
  RETURNING id INTO new_order;
  INSERT INTO public.entitlements (buyer_id, guide_id, version_id, order_id, license_type)
  VALUES (auth.uid(), g.id, v.id, new_order, 'personal') RETURNING id INTO new_entitlement;
  PERFORM public.write_audit('order.free_claimed', 'order', new_order, jsonb_build_object('guide_id', g.id, 'version_id', v.id));
  RETURN new_entitlement;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_free_resource(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_free_resource(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_pending_order(p_guide_id uuid, p_license_type text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g public.guides%ROWTYPE;
  v public.guide_versions%ROWTYPE;
  s public.commercial_settings%ROWTYPE;
  amount integer;
  existing uuid;
  new_order uuid;
BEGIN
  SELECT * INTO s FROM public.commercial_settings WHERE id = 1;
  IF NOT s.paid_checkout_enabled THEN RAISE EXCEPTION 'Paid checkout is not available yet.'; END IF;
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Sign in with a verified email to check out.';
  END IF;
  IF p_license_type NOT IN ('personal', 'team') THEN RAISE EXCEPTION 'Unknown license.'; END IF;
  SELECT * INTO g FROM public.guides WHERE id = p_guide_id;
  IF NOT FOUND OR g.status <> 'published' OR g.published_version_id IS NULL THEN RAISE EXCEPTION 'This resource is not available.'; END IF;
  SELECT * INTO v FROM public.guide_versions WHERE id = g.published_version_id;
  amount := CASE WHEN p_license_type = 'team' THEN v.team_price_cents ELSE v.price_cents END;
  IF amount IS NULL OR amount <= 0 THEN RAISE EXCEPTION 'This license is not offered for sale.'; END IF;
  SELECT o.id INTO existing FROM public.orders o
  WHERE o.buyer_id = auth.uid() AND o.version_id = v.id AND o.license_type = p_license_type AND o.status = 'pending';
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  INSERT INTO public.orders (buyer_id, guide_id, version_id, creator_id, license_type, status, amount_cents, currency_code)
  VALUES (auth.uid(), g.id, v.id, g.creator_id, p_license_type, 'pending', amount, v.currency_code)
  RETURNING id INTO new_order;
  PERFORM public.write_audit('order.created', 'order', new_order, jsonb_build_object('amount_cents', amount));
  RETURN new_order;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_pending_order(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pending_order(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  p_order_id uuid, p_provider text, p_provider_event_id text, p_amount_cents integer, p_currency_code text, p_payload jsonb
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o public.orders%ROWTYPE;
  s public.commercial_settings%ROWTYPE;
  event_id uuid;
  platform_fee integer;
  processing_fee integer;
  available timestamptz;
BEGIN
  INSERT INTO public.payment_events (order_id, provider, provider_event_id, event_type, amount_cents, currency_code, payload)
  VALUES (p_order_id, p_provider, p_provider_event_id, 'payment_succeeded', p_amount_cents, p_currency_code, COALESCE(p_payload, '{}'::jsonb))
  ON CONFLICT (provider, provider_event_id) DO NOTHING
  RETURNING id INTO event_id;
  IF event_id IS NULL THEN RETURN 'duplicate_event'; END IF;

  SELECT * INTO o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    UPDATE public.payment_events SET outcome = 'unknown_order' WHERE id = event_id;
    RETURN 'unknown_order';
  END IF;
  IF o.status = 'paid' THEN
    UPDATE public.payment_events SET outcome = 'already_paid' WHERE id = event_id;
    RETURN 'already_paid';
  END IF;
  IF o.status <> 'pending' THEN
    UPDATE public.payment_events SET outcome = 'order_not_pending' WHERE id = event_id;
    RETURN 'order_not_pending';
  END IF;
  IF p_amount_cents IS DISTINCT FROM o.amount_cents OR upper(p_currency_code) IS DISTINCT FROM o.currency_code THEN
    UPDATE public.payment_events SET outcome = 'amount_mismatch' WHERE id = event_id;
    RETURN 'amount_mismatch';
  END IF;

  SELECT * INTO s FROM public.commercial_settings WHERE id = 1;
  platform_fee := round(o.amount_cents * s.platform_fee_bps / 10000.0);
  processing_fee := round(o.amount_cents * s.processing_fee_bps / 10000.0) + s.processing_fee_fixed_cents;
  available := now() + make_interval(days => s.earnings_hold_days);

  UPDATE public.orders SET status = 'paid', paid_at = now(), provider = p_provider, provider_reference = p_provider_event_id WHERE id = o.id;
  INSERT INTO public.entitlements (buyer_id, guide_id, version_id, order_id, license_type)
  VALUES (o.buyer_id, o.guide_id, o.version_id, o.id, o.license_type) ON CONFLICT (order_id) DO NOTHING;
  INSERT INTO public.ledger_entries (order_id, creator_id, entry_type, amount_cents, currency_code, rate_bps, note, available_at) VALUES
    (o.id, o.creator_id, 'sale', o.amount_cents, o.currency_code, NULL, 'Gross sale ' || o.order_reference, available),
    (o.id, o.creator_id, 'platform_fee', -platform_fee, o.currency_code, s.platform_fee_bps, 'Platform fee', available),
    (o.id, o.creator_id, 'processing_fee', -processing_fee, o.currency_code, s.processing_fee_bps, 'Payment processing', available)
  ON CONFLICT DO NOTHING;
  UPDATE public.payment_events SET outcome = 'paid' WHERE id = event_id;
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, details)
  VALUES (NULL, 'order.paid', 'order', o.id, jsonb_build_object('provider', p_provider, 'event', p_provider_event_id));
  PERFORM public.notify_user(o.creator_id, 'New sale', 'Order ' || o.order_reference, '/creator');
  PERFORM public.notify_user(o.buyer_id, 'Payment confirmed', 'Your resource is in your library. Order ' || o.order_reference, '/library');
  RETURN 'paid';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.confirm_order_payment(uuid, text, text, integer, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(uuid, text, text, integer, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_order_unpaid(p_order_id uuid, p_status text, p_provider text, p_provider_event_id text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE event_id uuid; o public.orders%ROWTYPE;
BEGIN
  IF p_status NOT IN ('failed', 'cancelled') THEN RAISE EXCEPTION 'Unknown status'; END IF;
  INSERT INTO public.payment_events (order_id, provider, provider_event_id, event_type)
  VALUES (p_order_id, p_provider, p_provider_event_id, 'payment_' || p_status)
  ON CONFLICT (provider, provider_event_id) DO NOTHING RETURNING id INTO event_id;
  IF event_id IS NULL THEN RETURN 'duplicate_event'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR o.status <> 'pending' THEN
    UPDATE public.payment_events SET outcome = 'ignored' WHERE id = event_id;
    RETURN 'ignored';
  END IF;
  UPDATE public.orders SET status = p_status WHERE id = o.id;
  UPDATE public.payment_events SET outcome = p_status WHERE id = event_id;
  RETURN p_status;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.mark_order_unpaid(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_unpaid(uuid, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.record_ledger_adjustment(p_creator_id uuid, p_amount_cents integer, p_currency_code text, p_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can adjust earnings.'; END IF;
  IF p_amount_cents = 0 THEN RAISE EXCEPTION 'Adjustment amount cannot be zero.'; END IF;
  IF length(trim(COALESCE(p_note, ''))) < 5 THEN RAISE EXCEPTION 'Explain the adjustment.'; END IF;
  INSERT INTO public.ledger_entries (creator_id, entry_type, amount_cents, currency_code, note, created_by)
  VALUES (p_creator_id, 'adjustment', p_amount_cents, upper(p_currency_code), trim(p_note), auth.uid()) RETURNING id INTO new_id;
  PERFORM public.write_audit('ledger.adjustment', 'ledger_entry', new_id, jsonb_build_object('creator_id', p_creator_id, 'amount_cents', p_amount_cents, 'note', trim(p_note)));
  PERFORM public.notify_user(p_creator_id, 'Earnings adjustment recorded', trim(p_note), '/creator');
  RETURN new_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_ledger_adjustment(uuid, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_ledger_adjustment(uuid, integer, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_payout(p_creator_id uuid, p_amount_cents integer, p_currency_code text, p_reference text, p_method_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE available_balance integer; new_payout uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can record payouts.'; END IF;
  IF p_amount_cents <= 0 THEN RAISE EXCEPTION 'Payout amount must be positive.'; END IF;
  IF length(trim(COALESCE(p_reference, ''))) < 3 THEN RAISE EXCEPTION 'Add the payout reference.'; END IF;
  SELECT COALESCE(SUM(amount_cents), 0) INTO available_balance FROM public.ledger_entries
  WHERE creator_id = p_creator_id AND currency_code = upper(p_currency_code) AND available_at <= now();
  IF p_amount_cents > available_balance THEN RAISE EXCEPTION 'Payout exceeds the available balance.'; END IF;
  INSERT INTO public.payouts (creator_id, amount_cents, currency_code, status, method_note, reference, created_by, paid_at)
  VALUES (p_creator_id, p_amount_cents, upper(p_currency_code), 'paid', COALESCE(p_method_note, ''), trim(p_reference), auth.uid(), now())
  RETURNING id INTO new_payout;
  INSERT INTO public.ledger_entries (creator_id, payout_id, entry_type, amount_cents, currency_code, note, created_by)
  VALUES (p_creator_id, new_payout, 'payout', -p_amount_cents, upper(p_currency_code), 'Payout ' || trim(p_reference), auth.uid());
  PERFORM public.write_audit('payout.recorded', 'payout', new_payout, jsonb_build_object('creator_id', p_creator_id, 'amount_cents', p_amount_cents));
  PERFORM public.notify_user(p_creator_id, 'Payout recorded', 'Reference ' || trim(p_reference), '/creator');
  RETURN new_payout;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_payout(uuid, integer, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_payout(uuid, integer, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_commercial_settings(
  p_platform_fee_bps integer, p_processing_fee_bps integer, p_processing_fee_fixed_cents integer, p_earnings_hold_days integer, p_notes text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can change commercial settings.'; END IF;
  UPDATE public.commercial_settings SET
    platform_fee_bps = p_platform_fee_bps, processing_fee_bps = p_processing_fee_bps,
    processing_fee_fixed_cents = p_processing_fee_fixed_cents, earnings_hold_days = p_earnings_hold_days,
    notes = COALESCE(p_notes, ''), updated_at = now(), updated_by = auth.uid()
  WHERE id = 1;
  PERFORM public.write_audit('settings.commercial_updated', 'commercial_settings', NULL,
    jsonb_build_object('platform_fee_bps', p_platform_fee_bps, 'processing_fee_bps', p_processing_fee_bps, 'fixed_cents', p_processing_fee_fixed_cents, 'hold_days', p_earnings_hold_days));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_commercial_settings(integer, integer, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_commercial_settings(integer, integer, integer, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_support_case(p_case_id uuid, p_status text, p_resolution_action text, p_resolution text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.support_cases%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can update cases.'; END IF;
  SELECT * INTO c FROM public.support_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case not found.'; END IF;
  IF p_status IN ('resolved', 'closed') AND (p_resolution_action IS NULL OR length(trim(COALESCE(p_resolution, ''))) < 5) THEN
    RAISE EXCEPTION 'Record the outcome and what was done before resolving.';
  END IF;
  UPDATE public.support_cases SET
    status = p_status, resolution_action = p_resolution_action, resolution = COALESCE(trim(p_resolution), ''),
    resolved_by = CASE WHEN p_status IN ('resolved', 'closed') THEN auth.uid() ELSE NULL END,
    resolved_at = CASE WHEN p_status IN ('resolved', 'closed') THEN now() ELSE NULL END
  WHERE id = p_case_id;
  PERFORM public.write_audit('case.' || p_status, 'support_case', p_case_id, jsonb_build_object('action', p_resolution_action, 'resolution', p_resolution));
  PERFORM public.notify_user(c.reporter_id, 'Update on your support case', 'Status: ' || p_status || CASE WHEN length(COALESCE(p_resolution, '')) > 0 THEN ' — ' || p_resolution ELSE '' END, '/library');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_support_case(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_support_case(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderate_feedback(p_feedback_id uuid, p_status text, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can moderate feedback.'; END IF;
  IF p_status NOT IN ('visible', 'hidden') THEN RAISE EXCEPTION 'Unknown status.'; END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 5 THEN RAISE EXCEPTION 'Record a moderation reason.'; END IF;
  UPDATE public.resource_feedback SET status = p_status, moderation_reason = trim(p_reason), moderated_by = auth.uid(), moderated_at = now()
  WHERE id = p_feedback_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Feedback not found.'; END IF;
  PERFORM public.write_audit('feedback.' || p_status, 'resource_feedback', p_feedback_id, jsonb_build_object('reason', trim(p_reason)));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.moderate_feedback(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_feedback(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_entitlement(p_entitlement_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can change access.'; END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 5 THEN RAISE EXCEPTION 'Record a reason.'; END IF;
  UPDATE public.entitlements SET revoked_at = now(), revoked_reason = trim(p_reason) WHERE id = p_entitlement_id AND revoked_at IS NULL;
  PERFORM public.write_audit('entitlement.revoked', 'entitlement', p_entitlement_id, jsonb_build_object('reason', trim(p_reason)));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.revoke_entitlement(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_entitlement(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.restore_entitlement(p_entitlement_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can change access.'; END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 5 THEN RAISE EXCEPTION 'Record a reason.'; END IF;
  UPDATE public.entitlements SET revoked_at = NULL, revoked_reason = NULL WHERE id = p_entitlement_id;
  PERFORM public.write_audit('entitlement.restored', 'entitlement', p_entitlement_id, jsonb_build_object('reason', trim(p_reason)));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.restore_entitlement(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_entitlement(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_category_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'category.' || lower(TG_OP), 'category', COALESCE(NEW.id, OLD.id),
    jsonb_build_object('name', COALESCE(NEW.name, OLD.name), 'old_name', CASE WHEN TG_OP = 'UPDATE' THEN OLD.name END));
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER categories_audit AFTER INSERT OR UPDATE OR DELETE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.audit_category_change();