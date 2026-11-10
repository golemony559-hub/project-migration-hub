-- ===== Roles =====
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles; admins read all" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.admin_invites (
  email text PRIMARY KEY CHECK (email = lower(email)),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.admin_invites TO authenticated;
GRANT ALL ON public.admin_invites TO service_role;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage admin invites" ON public.admin_invites
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.grant_invited_admin_on_confirm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND NEW.email IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.admin_invites WHERE email = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_confirmed_admin
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_invited_admin_on_confirm();

CREATE OR REPLACE FUNCTION public.grant_admin_for_new_invite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  SELECT u.id, 'admin' FROM auth.users u
  WHERE lower(u.email) = NEW.email AND u.email_confirmed_at IS NOT NULL
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_admin_invite_created
AFTER INSERT ON public.admin_invites
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_new_invite();

-- ===== Audit log & notifications =====
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.audit_log
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX audit_log_created_idx ON public.audit_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.write_audit(_action text, _entity_type text, _entity_id uuid, _details jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, COALESCE(_details, '{}'::jsonb));
$$;
REVOKE EXECUTE ON FUNCTION public.write_audit(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications
FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users mark own notifications read" ON public.notifications
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _title text, _body text, _link text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, body, link) VALUES (_user_id, _title, COALESCE(_body, ''), _link);
$$;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- ===== Categories =====
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (length(trim(name)) BETWEEN 2 AND 60),
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  risk_sensitive boolean NOT NULL DEFAULT false,
  risk_guidance text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are public" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins add categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update categories" ON public.categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete categories" ON public.categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.categories (name, description, sort_order, risk_sensitive, risk_guidance) VALUES
  ('Business', 'Running and growing a business, freelancing and operations.', 10, false, ''),
  ('Farming & food', 'Livestock, poultry, crops, food production and processing.', 20, false, 'Animal-health or veterinary treatment advice must be flagged as risk-sensitive and needs specialist review.'),
  ('Home & repair', 'Repairs, maintenance and practical home projects.', 30, false, 'Electrical, gas and structural work must include safety limits and when to call a licensed professional.'),
  ('Marketing', 'Finding customers, messaging, channels and campaigns.', 40, false, ''),
  ('Money', 'Personal and small-business money management.', 50, true, 'Financial, tax or investment guidance is risk-sensitive: it needs sources, dates, clear limits and specialist review.'),
  ('Technology', 'Software, tools, product and technical skills.', 60, false, '');

-- ===== Guides (live, approved listing) =====
ALTER TABLE public.guides DROP CONSTRAINT guides_format_check;
ALTER TABLE public.guides DROP CONSTRAINT guides_status_check;
ALTER TABLE public.guides DROP CONSTRAINT published_guides_require_file;
ALTER TABLE public.guides ADD CONSTRAINT guides_format_check CHECK (format IN ('Guide', 'Playbook', 'Toolkit', 'Template', 'Checklist', 'Spreadsheet / calculator', 'Ebook'));
ALTER TABLE public.guides ADD CONSTRAINT guides_status_check CHECK (status IN ('draft', 'published', 'unlisted'));
ALTER TABLE public.guides ADD CONSTRAINT guides_category_fkey FOREIGN KEY (category) REFERENCES public.categories(name) ON UPDATE CASCADE;

ALTER TABLE public.guides
  ADD COLUMN audience text NOT NULL DEFAULT '',
  ADD COLUMN outcomes text NOT NULL DEFAULT '',
  ADD COLUMN contents text NOT NULL DEFAULT '',
  ADD COLUMN limitations text NOT NULL DEFAULT '',
  ADD COLUMN how_to_use text NOT NULL DEFAULT '',
  ADD COLUMN preview_text text NOT NULL DEFAULT '',
  ADD COLUMN tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN access_format text NOT NULL DEFAULT 'download' CHECK (access_format IN ('download', 'reference', 'both')),
  ADD COLUMN team_price_cents integer CHECK (team_price_cents IS NULL OR team_price_cents >= 0),
  ADD COLUMN ai_assistance text NOT NULL DEFAULT 'none' CHECK (ai_assistance IN ('none', 'editing', 'drafting', 'substantial')),
  ADD COLUMN ai_disclosure text NOT NULL DEFAULT '',
  ADD COLUMN risk_sensitive boolean NOT NULL DEFAULT false,
  ADD COLUMN sources_note text NOT NULL DEFAULT '',
  ADD COLUMN published_version_id uuid,
  ADD COLUMN published_at timestamptz,
  ADD COLUMN live_updated_at timestamptz;
COMMENT ON COLUMN public.guides.file_path IS 'DEPRECATED: files live on guide_versions.file_path; the live version is guides.published_version_id';

DROP POLICY "Published guides are public" ON public.guides;
DROP POLICY "Creators can add their own guides" ON public.guides;
DROP POLICY "Creators can update their own guides" ON public.guides;
DROP POLICY "Creators can delete their own guides" ON public.guides;
CREATE POLICY "Published guides are public" ON public.guides FOR SELECT TO anon, authenticated USING (status = 'published' AND published_version_id IS NOT NULL);
CREATE POLICY "Admins read all guides" ON public.guides FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Creators add private guide shells" ON public.guides FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id AND status = 'draft' AND published_version_id IS NULL AND published_at IS NULL);
CREATE POLICY "Creators delete never-published guides" ON public.guides FOR DELETE TO authenticated
  USING (auth.uid() = creator_id AND published_version_id IS NULL);
REVOKE UPDATE ON public.guides FROM authenticated;

-- ===== Versions (every editable/submitted version) =====
CREATE TABLE public.guide_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'in_review', 'changes_requested', 'rejected', 'approved', 'superseded')),
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  audience text NOT NULL DEFAULT '',
  outcomes text NOT NULL DEFAULT '',
  contents text NOT NULL DEFAULT '',
  limitations text NOT NULL DEFAULT '',
  how_to_use text NOT NULL DEFAULT '',
  preview_text text NOT NULL DEFAULT '',
  sources_note text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  category text NOT NULL DEFAULT 'Business' REFERENCES public.categories(name) ON UPDATE CASCADE,
  format text NOT NULL DEFAULT 'Guide' CHECK (format IN ('Guide', 'Playbook', 'Toolkit', 'Template', 'Checklist', 'Spreadsheet / calculator', 'Ebook')),
  access_format text NOT NULL DEFAULT 'download' CHECK (access_format IN ('download', 'reference', 'both')),
  reading_time_minutes integer CHECK (reading_time_minutes IS NULL OR reading_time_minutes > 0),
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  team_price_cents integer CHECK (team_price_cents IS NULL OR team_price_cents >= 0),
  currency_code text NOT NULL DEFAULT 'USD' CHECK (currency_code ~ '^[A-Z]{3}$'),
  ai_assistance text NOT NULL DEFAULT 'none' CHECK (ai_assistance IN ('none', 'editing', 'drafting', 'substantial')),
  ai_disclosure text NOT NULL DEFAULT '',
  risk_sensitive boolean NOT NULL DEFAULT false,
  reference_content text NOT NULL DEFAULT '',
  file_path text,
  file_name text,
  file_size_bytes bigint,
  file_mime text,
  rights_confirmed_at timestamptz,
  accuracy_confirmed_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guide_id, version_number)
);
ALTER TABLE public.guides ADD CONSTRAINT guides_published_version_fkey FOREIGN KEY (published_version_id) REFERENCES public.guide_versions(id) ON DELETE SET NULL;

GRANT SELECT, DELETE ON public.guide_versions TO authenticated;
GRANT INSERT (guide_id, creator_id, title, summary, description, audience, outcomes, contents, limitations, how_to_use, preview_text, sources_note, tags, category, format, access_format, reading_time_minutes, price_cents, team_price_cents, currency_code, ai_assistance, ai_disclosure, risk_sensitive, reference_content, file_path, file_name, file_size_bytes, file_mime) ON public.guide_versions TO authenticated;
GRANT UPDATE (title, summary, description, audience, outcomes, contents, limitations, how_to_use, preview_text, sources_note, tags, category, format, access_format, reading_time_minutes, price_cents, team_price_cents, currency_code, ai_assistance, ai_disclosure, risk_sensitive, reference_content, file_path, file_name, file_size_bytes, file_mime) ON public.guide_versions TO authenticated;
GRANT ALL ON public.guide_versions TO service_role;
ALTER TABLE public.guide_versions ENABLE ROW LEVEL SECURITY;
CREATE INDEX guide_versions_guide_idx ON public.guide_versions (guide_id, version_number DESC);
CREATE INDEX guide_versions_state_idx ON public.guide_versions (state, submitted_at);

CREATE POLICY "Creators read own versions" ON public.guide_versions FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "Admins read all versions" ON public.guide_versions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Creators add drafts to own guides" ON public.guide_versions FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid() AND EXISTS (SELECT 1 FROM public.guides g WHERE g.id = guide_versions.guide_id AND g.creator_id = auth.uid()));
CREATE POLICY "Creators edit own open drafts" ON public.guide_versions FOR UPDATE TO authenticated
  USING (creator_id = auth.uid() AND state IN ('draft', 'changes_requested'))
  WITH CHECK (creator_id = auth.uid() AND state IN ('draft', 'changes_requested'));
CREATE POLICY "Creators delete own open drafts" ON public.guide_versions FOR DELETE TO authenticated
  USING (creator_id = auth.uid() AND state IN ('draft', 'changes_requested'));

CREATE OR REPLACE FUNCTION public.prepare_guide_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.guide_versions
    WHERE guide_id = NEW.guide_id AND state IN ('draft', 'in_review', 'changes_requested')
  ) THEN
    RAISE EXCEPTION 'This resource already has an open draft or review. Finish or withdraw it first.';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO NEW.version_number
  FROM public.guide_versions WHERE guide_id = NEW.guide_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guide_versions_prepare BEFORE INSERT ON public.guide_versions
FOR EACH ROW EXECUTE FUNCTION public.prepare_guide_version();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER guide_versions_touch BEFORE UPDATE ON public.guide_versions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER categories_touch BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== Reviews =====
CREATE TABLE public.guide_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.guide_versions(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved', 'changes_requested', 'rejected')),
  reason text NOT NULL,
  rubric jsonb NOT NULL DEFAULT '{}'::jsonb,
  escalation_required boolean NOT NULL DEFAULT false,
  specialist_reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.guide_reviews TO authenticated;
GRANT ALL ON public.guide_reviews TO service_role;
ALTER TABLE public.guide_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators read reviews of own versions" ON public.guide_reviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.guide_versions v WHERE v.id = guide_reviews.version_id AND v.creator_id = auth.uid()));
CREATE POLICY "Admins read all reviews" ON public.guide_reviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== Commercial settings =====
CREATE TABLE public.commercial_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  platform_fee_bps integer NOT NULL DEFAULT 0 CHECK (platform_fee_bps BETWEEN 0 AND 10000),
  processing_fee_bps integer NOT NULL DEFAULT 0 CHECK (processing_fee_bps BETWEEN 0 AND 10000),
  processing_fee_fixed_cents integer NOT NULL DEFAULT 0 CHECK (processing_fee_fixed_cents >= 0),
  earnings_hold_days integer NOT NULL DEFAULT 14 CHECK (earnings_hold_days BETWEEN 0 AND 120),
  rates_approved boolean NOT NULL DEFAULT false,
  paid_checkout_enabled boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.commercial_settings TO authenticated;
GRANT ALL ON public.commercial_settings TO service_role;
ALTER TABLE public.commercial_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read commercial settings" ON public.commercial_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.commercial_settings (id, notes) VALUES (1, 'Placeholder rates. Commission, fee allocation and payout cadence are not approved yet.');