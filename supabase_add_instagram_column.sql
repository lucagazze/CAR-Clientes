-- ============================================================
-- AGREGAR COLUMNA DE CONTEXTO DE INSTAGRAM PARA EL CEREBRO DE IA
-- Ejecutar esto en Supabase -> SQL Editor -> Run
-- ============================================================

ALTER TABLE public.car_clients 
  ADD COLUMN IF NOT EXISTS instagram_context text;

COMMENT ON COLUMN public.car_clients.instagram_context IS 'Resumen de las últimas publicaciones de Instagram de la marca para alimentar el contexto de IA';
