-- ===== Expert profiles =====
ALTER TABLE public.profiles
  ADD COLUMN professional_background text NOT NULL DEFAULT '' CHECK (length(professional_background) <= 2000),
  ADD COLUMN years_experience integer CHECK (years_experience IS NULL OR years_experience BETWEEN 0 AND 80),
  ADD COLUMN specializations text[] NOT NULL DEFAULT '{}',
  ADD COLUMN achievements text NOT NULL DEFAULT '' CHECK (length(achievements) <= 2000),
  ADD COLUMN qualifications text NOT NULL DEFAULT '' CHECK (length(qualifications) <= 2000);

CREATE TABLE public.creator_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('identity', 'experience', 'qualification')),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 300),
  verified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, kind)
);
GRANT SELECT ON public.creator_verifications TO anon;
GRANT SELECT, INSERT, DELETE ON public.creator_verifications TO authenticated;
GRANT ALL ON public.creator_verifications TO service_role;
ALTER TABLE public.creator_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Verification labels are public" ON public.creator_verifications FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins grant labels" ON public.creator_verifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND verified_by = auth.uid());
CREATE POLICY "Admins remove labels" ON public.creator_verifications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ===== Ask the Creator =====
CREATE TABLE public.creator_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  asker_name text NOT NULL CHECK (length(trim(asker_name)) BETWEEN 1 AND 100),
  asker_email text NOT NULL CHECK (length(asker_email) <= 255),
  question text NOT NULL CHECK (length(trim(question)) BETWEEN 5 AND 2000),
  answer text CHECK (answer IS NULL OR length(answer) <= 4000),
  answered_at timestamptz,
  is_public boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- The asker's email is never readable from the browser; only server code uses it.
GRANT SELECT (id, guide_id, creator_id, asker_name, question, answer, answered_at, is_public, status, created_at, updated_at)
  ON public.creator_questions TO anon, authenticated;
GRANT ALL ON public.creator_questions TO service_role;
ALTER TABLE public.creator_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public answers are visible" ON public.creator_questions FOR SELECT TO anon, authenticated
  USING (is_public AND status = 'answered' AND answer IS NOT NULL);
CREATE POLICY "Creators read questions about their products" ON public.creator_questions FOR SELECT TO authenticated
  USING (creator_id = auth.uid());
CREATE POLICY "Admins read all questions" ON public.creator_questions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX creator_questions_creator_idx ON public.creator_questions (creator_id, created_at DESC);
CREATE INDEX creator_questions_guide_idx ON public.creator_questions (guide_id, answered_at DESC);
CREATE INDEX creator_questions_email_idx ON public.creator_questions (lower(asker_email), created_at DESC);
CREATE TRIGGER creator_questions_touch BEFORE UPDATE ON public.creator_questions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== Playbook items (files, videos, links, text, tools) per version =====
CREATE TABLE public.product_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.guide_versions(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  section text NOT NULL DEFAULT '' CHECK (length(section) <= 120),
  position integer NOT NULL DEFAULT 0,
  kind text NOT NULL CHECK (kind IN ('file', 'video', 'link', 'text', 'tool')),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 4000),
  file_path text,
  file_name text,
  file_size_bytes bigint,
  file_mime text,
  url text CHECK (url IS NULL OR (url ~ '^https://' AND length(url) <= 1000)),
  tool_key text CHECK (tool_key IS NULL OR tool_key IN ('profit', 'cashflow', 'budget', 'crop_calendar', 'materials', 'custom')),
  tool_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_items_kind_fields CHECK (
    (kind = 'file' AND file_path IS NOT NULL) OR
    (kind IN ('video', 'link') AND url IS NOT NULL) OR
    (kind = 'tool' AND tool_key IS NOT NULL) OR
    kind = 'text'
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_items TO authenticated;
GRANT ALL ON public.product_items TO service_role;
ALTER TABLE public.product_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators read own items" ON public.product_items FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "Admins read all items" ON public.product_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Holders read items of versions they hold" ON public.product_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.entitlements e WHERE e.version_id = product_items.version_id AND e.buyer_id = auth.uid() AND e.revoked_at IS NULL));
CREATE POLICY "Creators add items to open drafts" ON public.product_items FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.guide_versions v WHERE v.id = product_items.version_id AND v.guide_id = product_items.guide_id
      AND v.creator_id = auth.uid() AND v.state IN ('draft', 'changes_requested')));
CREATE POLICY "Creators edit items of open drafts" ON public.product_items FOR UPDATE TO authenticated
  USING (creator_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.guide_versions v WHERE v.id = product_items.version_id AND v.state IN ('draft', 'changes_requested')))
  WITH CHECK (creator_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.guide_versions v WHERE v.id = product_items.version_id AND v.creator_id = auth.uid() AND v.state IN ('draft', 'changes_requested')));
CREATE POLICY "Creators delete items of open drafts" ON public.product_items FOR DELETE TO authenticated
  USING (creator_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.guide_versions v WHERE v.id = product_items.version_id AND v.state IN ('draft', 'changes_requested')));
CREATE INDEX product_items_version_idx ON public.product_items (version_id, position);
CREATE TRIGGER product_items_touch BEFORE UPDATE ON public.product_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Public outline of a live product: titles and kinds only, never the content.
CREATE OR REPLACE FUNCTION public.product_outline(p_guide_id uuid)
RETURNS TABLE (id uuid, section text, item_position integer, kind text, title text, description text, tool_key text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.section, i.position, i.kind, i.title, left(i.description, 280), i.tool_key
  FROM public.product_items i
  JOIN public.guides g ON g.id = i.guide_id AND g.published_version_id = i.version_id
  WHERE i.guide_id = p_guide_id AND g.status = 'published'
  ORDER BY i.position, i.created_at;
$$;
REVOKE EXECUTE ON FUNCTION public.product_outline(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.product_outline(uuid) TO anon, authenticated;

-- New revisions carry the live version's playbook items along.
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
  INSERT INTO public.product_items (version_id, guide_id, creator_id, section, position, kind, title, description,
    file_path, file_name, file_size_bytes, file_mime, url, tool_key, tool_config)
  SELECT new_id, i.guide_id, i.creator_id, i.section, i.position, i.kind, i.title, i.description,
    i.file_path, i.file_name, i.file_size_bytes, i.file_mime, i.url, i.tool_key, i.tool_config
  FROM public.product_items i WHERE i.version_id = live.id;
  PERFORM public.write_audit('version.revision_started', 'guide_version', new_id, jsonb_build_object('guide_id', p_guide_id));
  RETURN new_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.start_guide_revision(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_guide_revision(uuid) TO authenticated;

-- Download a playbook file through an emailed link.
CREATE OR REPLACE FUNCTION public.consume_download_link_item(p_token_hash text, p_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l public.download_links%ROWTYPE;
  o public.orders%ROWTYPE;
  i public.product_items%ROWTYPE;
  first_for_guide boolean := false;
BEGIN
  SELECT * INTO l FROM public.download_links WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('outcome', 'not_found'); END IF;
  IF l.expires_at IS NOT NULL AND l.expires_at <= now() THEN RETURN jsonb_build_object('outcome', 'expired'); END IF;
  IF l.download_count >= l.max_downloads THEN RETURN jsonb_build_object('outcome', 'limit'); END IF;
  SELECT * INTO o FROM public.orders WHERE id = l.order_id;
  IF o.status NOT IN ('free', 'paid') THEN RETURN jsonb_build_object('outcome', 'unavailable'); END IF;
  SELECT * INTO i FROM public.product_items WHERE id = p_item_id AND version_id = l.version_id AND kind = 'file';
  IF NOT FOUND OR i.file_path IS NULL THEN RETURN jsonb_build_object('outcome', 'unavailable'); END IF;
  UPDATE public.download_links SET download_count = download_count + 1,
    first_downloaded_at = COALESCE(first_downloaded_at, now()), last_downloaded_at = now()
  WHERE id = l.id;
  first_for_guide := public.mark_guide_first_download(l.guide_id);
  RETURN jsonb_build_object('outcome', 'ok', 'file_path', i.file_path, 'file_name', i.file_name,
    'guide_id', l.guide_id, 'first_for_guide', first_for_guide);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.consume_download_link_item(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_download_link_item(text, uuid) TO service_role;

-- ===== Quality & originality checks =====
CREATE TABLE public.version_quality_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.guide_versions(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  overall text NOT NULL CHECK (overall IN ('pass', 'needs_work', 'concern')),
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text NOT NULL DEFAULT '',
  flags text[] NOT NULL DEFAULT '{}',
  suggestions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.version_quality_checks TO authenticated;
GRANT ALL ON public.version_quality_checks TO service_role;
ALTER TABLE public.version_quality_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators read checks of own versions" ON public.version_quality_checks FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "Admins read all checks" ON public.version_quality_checks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX version_quality_checks_version_idx ON public.version_quality_checks (version_id, created_at DESC);

-- ===== Personal library =====
CREATE TABLE public.saved_products (
  user_id uuid NOT NULL,
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, guide_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_products TO authenticated;
GRANT ALL ON public.saved_products TO service_role;
ALTER TABLE public.saved_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved products" ON public.saved_products FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.library_notes (
  user_id uuid NOT NULL,
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '' CHECK (length(body) <= 10000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, guide_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_notes TO authenticated;
GRANT ALL ON public.library_notes TO service_role;
ALTER TABLE public.library_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notes" ON public.library_notes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.library_progress (
  user_id uuid NOT NULL,
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  percent integer NOT NULL DEFAULT 0 CHECK (percent BETWEEN 0 AND 100),
  completed_item_ids uuid[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, guide_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_progress TO authenticated;
GRANT ALL ON public.library_progress TO service_role;
ALTER TABLE public.library_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress" ON public.library_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own collections" ON public.collections FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.collection_items (
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, guide_id)
);
GRANT SELECT, INSERT, DELETE ON public.collection_items TO authenticated;
GRANT ALL ON public.collection_items TO service_role;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own collection items" ON public.collection_items FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_items.collection_id AND c.user_id = auth.uid()));

-- Signed-in users with a verified email get resources they requested by email into their library.
CREATE OR REPLACE FUNCTION public.attach_my_email_orders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  my_email text;
  o record;
  n integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  SELECT lower(u.email) INTO my_email FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL;
  IF my_email IS NULL THEN RETURN 0; END IF;
  FOR o IN SELECT * FROM public.orders WHERE buyer_id IS NULL AND lower(buyer_email) = my_email AND status IN ('free', 'paid') LOOP
    UPDATE public.orders SET buyer_id = auth.uid() WHERE id = o.id;
    IF NOT EXISTS (SELECT 1 FROM public.entitlements WHERE order_id = o.id) THEN
      INSERT INTO public.entitlements (buyer_id, guide_id, version_id, order_id, license_type)
      VALUES (auth.uid(), o.guide_id, o.version_id, o.id, o.license_type);
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.attach_my_email_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_my_email_orders() TO authenticated;