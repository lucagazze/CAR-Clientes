-- ============================================================
-- Migración: Agregar columna fb_page_access_token a car_clients
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columna para guardar el token de página de Facebook del cliente
ALTER TABLE public.car_clients
  ADD COLUMN IF NOT EXISTS fb_page_access_token text;
