-- ============================================================
-- Migración: Agregar columnas de Instagram a car_clients
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columnas
ALTER TABLE public.car_clients
  ADD COLUMN IF NOT EXISTS ig_business_id text,
  ADD COLUMN IF NOT EXISTS ig_username text;

-- 2. Migrar datos existentes del CLIENT_META_MAP hardcodeado
UPDATE public.car_clients SET ig_business_id = '17841460101454399', ig_username = 'atermicos.pinamar' WHERE id = '02504445-7e44-4599-8b62-6c44a1af4b24';
UPDATE public.car_clients SET ig_business_id = '17841438390504961', ig_username = 'libreriamayoristaleo' WHERE id = 'e0141716-178d-483b-8c2c-a58d391b83a1';
UPDATE public.car_clients SET ig_business_id = '17841446979077762', ig_username = 'lic.rociofuentes' WHERE id = 'b6d2f956-18c2-42d4-af3d-5a55442c234a';
UPDATE public.car_clients SET ig_business_id = '17841421861661046', ig_username = 'puertasblindasasjack' WHERE id = '9cc15a64-897f-412f-a048-86791ed04185';
UPDATE public.car_clients SET ig_business_id = '17841463377689897', ig_username = 'selecta' WHERE id = '51a050d9-5f32-4f95-8724-8eefff9666d6';
