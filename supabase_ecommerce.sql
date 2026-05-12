-- ============================================================
-- EJECUTAR EN: Supabase Dashboard -> SQL Editor -> Run
-- Propósito: Agregar las columnas para integrar Shopify y Tiendanube
-- ============================================================

ALTER TABLE public.car_clients ADD COLUMN IF NOT EXISTS ecommerce_platform text; -- 'shopify' o 'tiendanube'
ALTER TABLE public.car_clients ADD COLUMN IF NOT EXISTS shopify_domain text;
ALTER TABLE public.car_clients ADD COLUMN IF NOT EXISTS shopify_access_token text;
ALTER TABLE public.car_clients ADD COLUMN IF NOT EXISTS tiendanube_store_id text;
ALTER TABLE public.car_clients ADD COLUMN IF NOT EXISTS tiendanube_access_token text;

-- IMPORTANTE: 
-- Después de ejecutar este SQL, refresca tu aplicación.
