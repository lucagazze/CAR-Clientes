-- Permite pre-invitar cuentas Google sin que el usuario exista todavía en auth.users
-- Cuando el usuario ingrese con Google por primera vez, el sistema vincula su user_id automáticamente
ALTER TABLE public.car_business_accounts ALTER COLUMN user_id DROP NOT NULL;

-- También eliminamos el UNIQUE constraint en user_id para que NULL no colisione
ALTER TABLE public.car_business_accounts DROP CONSTRAINT IF EXISTS car_business_accounts_user_id_key;

-- Nuevo índice único parcial: solo aplica cuando user_id no es NULL
CREATE UNIQUE INDEX IF NOT EXISTS car_business_accounts_user_id_unique
  ON public.car_business_accounts (user_id)
  WHERE user_id IS NOT NULL;
