-- ============================================================
-- AGREGAR COLUMNAS PARA EL CEREBRO DE IA (CONOCIMIENTO DEL NEGOCIO)
-- Ejecutar esto en Supabase -> SQL Editor -> Run
-- ============================================================

ALTER TABLE public.car_clients 
  ADD COLUMN IF NOT EXISTS business_description text,
  ADD COLUMN IF NOT EXISTS custom_instructions text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS scraped_content text;

-- Habilitar lectura para todos los usuarios autenticados o según RLS existente
COMMENT ON COLUMN public.car_clients.business_description IS 'Descripción detallada del negocio y catálogo para la IA';
COMMENT ON COLUMN public.car_clients.custom_instructions IS 'Instrucciones personalizadas de tono y respuestas para la IA';
COMMENT ON COLUMN public.car_clients.website_url IS 'URL del sitio web oficial para escaneo de contenido';
COMMENT ON COLUMN public.car_clients.scraped_content IS 'Contenido extraído del sitio web para alimentar el contexto de IA';
