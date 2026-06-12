-- ═══════════════════════════════════════════════════════════════════════
-- EJECUTAR EN SUPABASE SQL EDITOR
-- Propósito: Permitir que un mismo usuario (user_id) esté asociado a múltiples
--            cuentas de negocio (business_id) simultáneamente.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Eliminar el índice único antiguo que bloquea tener múltiples registros con el mismo user_id
DROP INDEX IF EXISTS public.car_business_accounts_user_id_unique;

-- 2. Crear un nuevo índice único sobre la combinación (user_id, business_id)
--    Esto permite que un user_id tenga múltiples negocios, pero evita duplicar el mismo negocio para el mismo usuario.
DROP INDEX IF EXISTS public.car_business_accounts_user_business_unique;
CREATE UNIQUE INDEX car_business_accounts_user_business_unique
  ON public.car_business_accounts (user_id, business_id)
  WHERE user_id IS NOT NULL;
