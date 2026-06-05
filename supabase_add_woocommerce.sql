-- ============================================================
-- EJECUTAR EN: Supabase Dashboard -> SQL Editor -> Run
-- Propósito: Agregar las columnas para integrar WooCommerce / WordPress
-- ============================================================

ALTER TABLE public.car_clients ADD COLUMN IF NOT EXISTS wordpress_url text;
ALTER TABLE public.car_clients ADD COLUMN IF NOT EXISTS woo_consumer_key text;
ALTER TABLE public.car_clients ADD COLUMN IF NOT EXISTS woo_consumer_secret text;

-- IMPORTANTE:
-- Después de ejecutar este SQL, refresca tu aplicación.
