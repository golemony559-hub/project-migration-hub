-- ===== Orders, entitlements, payments, ledger, payouts =====
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_reference text NOT NULL UNIQUE DEFAULT ('DO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  buyer_id uuid NOT NULL,
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE RESTRICT,
  version_id uuid NOT NULL REFERENCES public.guide_versions(id) ON DELETE RESTRICT,
  creator_id uuid NOT NULL,
  license_type text NOT NULL DEFAULT 'personal' CHECK (license_type IN ('personal', 'team')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'free')),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency_code text NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  provider text,
  provider_reference text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers read own orders" ON public.orders FOR SELECT TO authenticated USING (buyer_id = auth.uid());
CREATE POLICY "Creators read orders for own resources" ON public.orders FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "Admins read all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX orders_one_pending_per_version ON public.orders (buyer_id, version_id, license_type) WHERE status = 'pending';
CREATE INDEX orders_buyer_idx ON public.orders (buyer_id, created_at DESC);
CREATE INDEX orders_creator_idx ON public.orders (creator_id, created_at DESC);
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE RESTRICT,
  version_id uuid NOT NULL REFERENCES public.guide_versions(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  license_type text NOT NULL DEFAULT 'personal' CHECK (license_type IN ('personal', 'team')),
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.entitlements TO authenticated;
GRANT ALL ON public.entitlements TO service_role;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers read own entitlements" ON public.entitlements FOR SELECT TO authenticated USING (buyer_id = auth.uid());
CREATE POLICY "Admins read all entitlements" ON public.entitlements FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX entitlements_buyer_idx ON public.entitlements (buyer_id, created_at DESC);

CREATE POLICY "Buyers read versions they hold" ON public.guide_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.entitlements e WHERE e.version_id = guide_versions.id AND e.buyer_id = auth.uid() AND e.revoked_at IS NULL));

CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  amount_cents integer,
  currency_code text,
  outcome text NOT NULL DEFAULT 'received',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);
GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read payment events" ON public.payment_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  payout_id uuid,
  creator_id uuid NOT NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('sale', 'platform_fee', 'processing_fee', 'adjustment', 'payout')),
  amount_cents integer NOT NULL,
  currency_code text NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  rate_bps integer,
  note text NOT NULL DEFAULT '',
  available_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators read own ledger" ON public.ledger_entries FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "Admins read all ledger" ON public.ledger_entries FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX ledger_creator_idx ON public.ledger_entries (creator_id, created_at DESC);
CREATE UNIQUE INDEX ledger_one_entry_per_order_type ON public.ledger_entries (order_id, entry_type) WHERE order_id IS NOT NULL AND entry_type IN ('sale', 'platform_fee', 'processing_fee');

CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency_code text NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('scheduled', 'paid', 'failed', 'cancelled')),
  method_note text NOT NULL DEFAULT '',
  reference text NOT NULL DEFAULT '',
  created_by uuid,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators read own payouts" ON public.payouts FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "Admins read all payouts" ON public.payouts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_payout_fkey FOREIGN KEY (payout_id) REFERENCES public.payouts(id) ON DELETE RESTRICT;

CREATE TABLE public.access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  entitlement_id uuid NOT NULL REFERENCES public.entitlements(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('download', 'reference_view')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.access_events TO authenticated;
GRANT ALL ON public.access_events TO service_role;
ALTER TABLE public.access_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers read own access events" ON public.access_events FOR SELECT TO authenticated USING (buyer_id = auth.uid());
CREATE POLICY "Buyers log own access" ON public.access_events FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid() AND EXISTS (SELECT 1 FROM public.entitlements e WHERE e.id = access_events.entitlement_id AND e.buyer_id = auth.uid() AND e.revoked_at IS NULL));
CREATE POLICY "Admins read all access events" ON public.access_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX access_events_buyer_idx ON public.access_events (buyer_id, created_at DESC);

-- ===== Support cases =====
CREATE TABLE public.support_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  case_type text NOT NULL CHECK (case_type IN ('access_failure', 'corrupted_file', 'wrong_file', 'listing_mismatch', 'rights_infringement', 'unsafe_content', 'other')),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  guide_id uuid REFERENCES public.guides(id) ON DELETE SET NULL,
  version_id uuid REFERENCES public.guide_versions(id) ON DELETE SET NULL,
  details text NOT NULL CHECK (length(trim(details)) BETWEEN 10 AND 4000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution_action text CHECK (resolution_action IS NULL OR resolution_action IN ('access_restored', 'replacement_provided', 'listing_corrected', 'refund_processed', 'takedown', 'no_action', 'other')),
  resolution text NOT NULL DEFAULT '',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_cases TO authenticated;
GRANT INSERT (reporter_id, case_type, order_id, guide_id, version_id, details) ON public.support_cases TO authenticated;
GRANT ALL ON public.support_cases TO service_role;
ALTER TABLE public.support_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporters read own cases" ON public.support_cases FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "Creators read cases about own resources" ON public.support_cases FOR SELECT TO authenticated
  USING (case_type <> 'rights_infringement' AND EXISTS (SELECT 1 FROM public.guides g WHERE g.id = support_cases.guide_id AND g.creator_id = auth.uid()));
CREATE POLICY "Admins read all cases" ON public.support_cases FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Signed-in users open cases" ON public.support_cases FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND (support_cases.order_id IS NULL OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = support_cases.order_id AND o.buyer_id = auth.uid()))
  );
CREATE TRIGGER support_cases_touch BEFORE UPDATE ON public.support_cases FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.notify_admins_of_case()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT r.user_id, 'New support case', replace(NEW.case_type, '_', ' '), '/admin?tab=cases'
  FROM public.user_roles r WHERE r.role = 'admin';
  RETURN NEW;
END;
$$;
CREATE TRIGGER support_cases_notify AFTER INSERT ON public.support_cases FOR EACH ROW EXECUTE FUNCTION public.notify_admins_of_case();

-- ===== Verified-purchase feedback =====
CREATE TABLE public.resource_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.guide_versions(id) ON DELETE CASCADE,
  entitlement_id uuid NOT NULL UNIQUE REFERENCES public.entitlements(id) ON DELETE CASCADE,
  usefulness smallint NOT NULL CHECK (usefulness BETWEEN 1 AND 5),
  clarity smallint NOT NULL CHECK (clarity BETWEEN 1 AND 5),
  listing_accuracy smallint NOT NULL CHECK (listing_accuracy BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '' CHECK (length(comment) <= 1000),
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
  moderation_reason text,
  moderated_by uuid,
  moderated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resource_feedback TO anon;
GRANT SELECT ON public.resource_feedback TO authenticated;
GRANT INSERT (buyer_id, guide_id, version_id, entitlement_id, usefulness, clarity, listing_accuracy, comment) ON public.resource_feedback TO authenticated;
GRANT UPDATE (usefulness, clarity, listing_accuracy, comment) ON public.resource_feedback TO authenticated;
GRANT ALL ON public.resource_feedback TO service_role;
ALTER TABLE public.resource_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visible feedback is public" ON public.resource_feedback FOR SELECT TO anon, authenticated USING (status = 'visible');
CREATE POLICY "Buyers read own feedback" ON public.resource_feedback FOR SELECT TO authenticated USING (buyer_id = auth.uid());
CREATE POLICY "Admins read all feedback" ON public.resource_feedback FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Verified holders leave feedback" ON public.resource_feedback FOR INSERT TO authenticated
  WITH CHECK (
    buyer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.entitlements e
      WHERE e.id = resource_feedback.entitlement_id AND e.buyer_id = auth.uid() AND e.version_id = resource_feedback.version_id AND e.guide_id = resource_feedback.guide_id AND e.revoked_at IS NULL
    )
    AND NOT EXISTS (SELECT 1 FROM public.guides g WHERE g.id = resource_feedback.guide_id AND g.creator_id = auth.uid())
  );
CREATE POLICY "Buyers edit own visible feedback" ON public.resource_feedback FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() AND status = 'visible') WITH CHECK (buyer_id = auth.uid());
CREATE TRIGGER resource_feedback_touch BEFORE UPDATE ON public.resource_feedback FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== Storage: admins can open submitted files for review =====
CREATE POLICY "Admins read creator files for review" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'creator-guides' AND public.has_role(auth.uid(), 'admin'));