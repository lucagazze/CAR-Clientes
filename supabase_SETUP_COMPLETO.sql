-- ============================================================
-- SETUP COMPLETO CAR-SaaS — Correr en SQL Editor de Supabase
-- Proyecto: czocbnyoenjbpxmcqobn
-- ============================================================

-- ─── 1. TABLA PRINCIPAL: car_clients ─────────────────────────
CREATE TABLE IF NOT EXISTS public.car_clients (
  id                      uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id                 uuid UNIQUE,
  business_name           text NOT NULL DEFAULT 'Mi negocio',
  business_logo_url       text,
  industry                text,
  plan                    text DEFAULT 'CAR Growth',
  chatwoot_url            text,
  chatwoot_token          text,
  active                  boolean NOT NULL DEFAULT true,
  is_admin                boolean NOT NULL DEFAULT false,
  -- Meta Ads
  meta_account_id         text,
  meta_pixel_id           text,
  facebook_access_token   text,
  -- Klaviyo
  klaviyo_api_key         text,
  klaviyo_list_id         text,
  -- Ecommerce
  ecommerce_platform      text,
  shopify_domain          text,
  shopify_access_token    text,
  tiendanube_store_id     text,
  tiendanube_access_token text,
  -- WordPress / WooCommerce
  wordpress_url           text,
  woo_consumer_key        text,
  woo_consumer_secret     text,
  -- Facebook Page
  fb_page_id              text,
  fb_page_name            text,
  fb_page_access_token    text,
  -- Instagram
  instagram_account_id    text,
  instagram_username      text,
  -- Connection statuses
  connection_statuses     jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Misc
  client_tags             text[],
  business_description    text,
  custom_instructions     text,
  website_url             text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT car_clients_pkey PRIMARY KEY (id),
  CONSTRAINT car_clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ─── 2. TABLA: car_business_accounts (usuarios multi-negocio) ─
CREATE TABLE IF NOT EXISTS public.car_business_accounts (
  id          bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  business_id uuid NOT NULL,
  user_id     uuid,
  email       text,
  role        text DEFAULT 'viewer',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT car_business_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT car_business_accounts_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.car_clients(id) ON DELETE CASCADE
);

-- ─── 3. TABLA: car_meta_metrics ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.car_meta_metrics (
  id               bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  client_id        uuid NOT NULL,
  period_start     date NOT NULL,
  period_end       date NOT NULL,
  impressions      integer NOT NULL DEFAULT 0,
  reach            integer NOT NULL DEFAULT 0,
  frequency        numeric(5,2),
  cpm              numeric(10,2),
  clicks           integer NOT NULL DEFAULT 0,
  ctr              numeric(5,2) NOT NULL DEFAULT 0,
  conversions      integer NOT NULL DEFAULT 0,
  cost_per_result  numeric(10,2),
  spend            numeric(12,2) NOT NULL DEFAULT 0,
  currency         text NOT NULL DEFAULT 'USD',
  roas             numeric(8,2),
  awareness_level  text,
  campaign_name    text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT car_meta_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT car_meta_metrics_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.car_clients(id) ON DELETE CASCADE
);

-- ─── 4. TABLA: car_email_metrics ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.car_email_metrics (
  id                  bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  client_id           uuid NOT NULL,
  period_start        date NOT NULL,
  period_end          date NOT NULL,
  campaign_name       text NOT NULL,
  campaign_type       text,
  emails_sent         integer NOT NULL DEFAULT 0,
  delivered           integer NOT NULL DEFAULT 0,
  open_rate           numeric(5,2) NOT NULL DEFAULT 0,
  click_rate          numeric(5,2) NOT NULL DEFAULT 0,
  unsubscribe_rate    numeric(5,2) NOT NULL DEFAULT 0,
  unique_opens        integer NOT NULL DEFAULT 0,
  unique_clicks       integer NOT NULL DEFAULT 0,
  bounces             integer NOT NULL DEFAULT 0,
  revenue_attributed  numeric(12,2),
  currency            text NOT NULL DEFAULT 'ARS',
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT car_email_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT car_email_metrics_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.car_clients(id) ON DELETE CASCADE
);

-- ─── 5. TABLA: car_links ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.car_links (
  id          bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  client_id   uuid NOT NULL,
  label       text NOT NULL,
  url         text NOT NULL,
  icon        text,
  category    text DEFAULT 'general',
  sort_order  integer NOT NULL DEFAULT 0,
  CONSTRAINT car_links_pkey PRIMARY KEY (id),
  CONSTRAINT car_links_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.car_clients(id) ON DELETE CASCADE
);

-- ─── 6. TABLA: car_reports ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.car_reports (
  id            bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  client_id     uuid NOT NULL,
  title         text NOT NULL,
  period        text NOT NULL,
  file_url      text,
  storage_path  text,
  summary       text,
  highlights    jsonb DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT car_reports_pkey PRIMARY KEY (id),
  CONSTRAINT car_reports_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.car_clients(id) ON DELETE CASCADE
);

-- ─── 7. TABLA: car_activity ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.car_activity (
  id          bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id     uuid,
  client_id   uuid,
  event_type  text NOT NULL,
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT car_activity_pkey PRIMARY KEY (id)
);

-- ─── 8. TABLA: client_links (alias usado en DashboardPage) ───
CREATE TABLE IF NOT EXISTS public.client_links (
  id         bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  client_id  uuid NOT NULL,
  title      text NOT NULL,
  url        text NOT NULL,
  icon       text DEFAULT 'link',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_links_pkey PRIMARY KEY (id),
  CONSTRAINT client_links_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.car_clients(id) ON DELETE CASCADE
);

-- ─── 9. TABLA: AgencySettings ────────────────────────────────
CREATE TABLE IF NOT EXISTS public."AgencySettings" (
  key   text NOT NULL,
  value text NOT NULL,
  CONSTRAINT agency_settings_pkey PRIMARY KEY (key)
);
ALTER TABLE public."AgencySettings" DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_car_clients_user_id     ON public.car_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_car_meta_client          ON public.car_meta_metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_car_email_client         ON public.car_email_metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_car_links_client         ON public.car_links(client_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_car_reports_client       ON public.car_reports(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_car_activity_client      ON public.car_activity(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_car_biz_accounts_biz     ON public.car_business_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_car_biz_accounts_user    ON public.car_business_accounts(user_id);


-- ============================================================
-- FUNCIÓN HELPER: is_car_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_car_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.car_clients
    WHERE user_id = auth.uid() AND is_admin = true
  );
$$;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.car_clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_meta_metrics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_email_metrics    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_links            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_activity         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_links         ENABLE ROW LEVEL SECURITY;

-- car_clients
DROP POLICY IF EXISTS "car_clients_select_own"       ON public.car_clients;
DROP POLICY IF EXISTS "car_clients_update_own"       ON public.car_clients;
DROP POLICY IF EXISTS "car_clients_admin_select_all" ON public.car_clients;
DROP POLICY IF EXISTS "car_clients_admin_update_all" ON public.car_clients;
DROP POLICY IF EXISTS "car_clients_admin_insert"     ON public.car_clients;

CREATE POLICY "car_clients_select_own"
  ON public.car_clients FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_car_admin()
    OR EXISTS (
      SELECT 1 FROM public.car_business_accounts
      WHERE business_id = public.car_clients.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "car_clients_update_own"
  ON public.car_clients FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_car_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_car_admin());

CREATE POLICY "car_clients_admin_insert"
  ON public.car_clients FOR INSERT TO authenticated
  WITH CHECK (public.is_car_admin() OR auth.uid() = user_id);

-- car_meta_metrics
DROP POLICY IF EXISTS "car_meta_select_own" ON public.car_meta_metrics;
CREATE POLICY "car_meta_select_own"
  ON public.car_meta_metrics FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.car_clients WHERE user_id = auth.uid()) OR public.is_car_admin());

-- car_email_metrics
DROP POLICY IF EXISTS "car_email_select_own" ON public.car_email_metrics;
CREATE POLICY "car_email_select_own"
  ON public.car_email_metrics FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.car_clients WHERE user_id = auth.uid()) OR public.is_car_admin());

-- car_links
DROP POLICY IF EXISTS "car_links_select_own" ON public.car_links;
CREATE POLICY "car_links_select_own"
  ON public.car_links FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.car_clients WHERE user_id = auth.uid()) OR public.is_car_admin());

-- car_reports
DROP POLICY IF EXISTS "car_reports_select_own" ON public.car_reports;
CREATE POLICY "car_reports_select_own"
  ON public.car_reports FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.car_clients WHERE user_id = auth.uid()) OR public.is_car_admin());

-- car_activity
DROP POLICY IF EXISTS "car_activity_select_own" ON public.car_activity;
CREATE POLICY "car_activity_select_own"
  ON public.car_activity FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_car_admin());

-- car_business_accounts
DROP POLICY IF EXISTS "car_biz_accounts_select" ON public.car_business_accounts;
CREATE POLICY "car_biz_accounts_select"
  ON public.car_business_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_car_admin());

DROP POLICY IF EXISTS "car_biz_accounts_update_own" ON public.car_business_accounts;
CREATE POLICY "car_biz_accounts_update_own"
  ON public.car_business_accounts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_car_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_car_admin());

-- client_links
DROP POLICY IF EXISTS "client_links_select_own" ON public.client_links;
CREATE POLICY "client_links_select_own"
  ON public.client_links FOR SELECT
  USING (client_id IN (SELECT id FROM public.car_clients WHERE user_id = auth.uid()) OR public.is_car_admin());

DROP POLICY IF EXISTS "client_links_admin_all" ON public.client_links;
CREATE POLICY "client_links_admin_all"
  ON public.client_links FOR ALL
  USING (public.is_car_admin())
  WITH CHECK (public.is_car_admin());


-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('car_clients','car_meta_metrics','car_email_metrics','car_links','car_reports','car_activity','car_business_accounts','client_links','AgencySettings')
ORDER BY table_name;
