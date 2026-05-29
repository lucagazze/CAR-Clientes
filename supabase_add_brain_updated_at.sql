-- ============================================================
-- Migración: Agregar columna brain_updated_at a car_clients
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.car_clients
  ADD COLUMN IF NOT EXISTS brain_updated_at timestamptz;

COMMENT ON COLUMN public.car_clients.brain_updated_at IS 'Fecha y hora del último escaneo y guardado del cerebro de IA';
