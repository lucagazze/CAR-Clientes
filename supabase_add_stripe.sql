-- Stripe como "tienda": los movimientos de saldo (balance transactions) de las cuentas de
-- Stripe de cada cliente. Dan el dinero real: bruto, comisión exacta, reembolsos,
-- contracargos y neto. Solo el servidor lee y escribe (RLS sin políticas).

-- Qué cuentas de Stripe ve cada cliente. En una tabla aparte (y no en car_clients) porque
-- car_clients la puede editar el propio cliente, y con la clave de organización eso le
-- daría acceso a cuentas ajenas.
create table if not exists car_stripe_links (
  client_id uuid not null references car_clients(id) on delete cascade,
  account_id text not null,          -- acct_...
  account_name text,
  api_key text,                      -- clave restringida propia; null = clave de organización (env STRIPE_ORG_KEY)
  created_at timestamptz not null default now(),
  primary key (client_id, account_id)
);
alter table car_stripe_links enable row level security;

create table if not exists car_stripe_transactions (
  account_id text not null,
  txn_id text not null,              -- txn_...
  reporting_category text not null,  -- charge | refund | dispute | dispute_reversal | fee | payout | ...
  type text,
  created_at timestamptz not null,
  amount numeric not null,           -- en la moneda de liquidación, en unidades (no centavos)
  fee numeric not null default 0,    -- comisión de Stripe + la de la plataforma (Impultienda)
  net numeric not null,
  currency text not null,
  source_id text,                    -- ch_ / re_ / dp_ / po_
  charge_id text,                    -- cargo original (también en reembolsos y disputas)
  payment_intent text,               -- pi_... (el "IDPago" del Excel de Impultienda)
  order_id text,                     -- metadata.orderId de Impultienda
  store_id text,                     -- metadata.storeId de Impultienda
  customer_email text,
  customer_name text,
  buyer_amount numeric,              -- lo que pagó el comprador, en su moneda
  buyer_currency text,
  country text,
  is_post_purchase boolean not null default false,
  primary key (account_id, txn_id)
);
create index if not exists car_stripe_tx_account_date on car_stripe_transactions (account_id, created_at desc);
create index if not exists car_stripe_tx_charge on car_stripe_transactions (charge_id);
create index if not exists car_stripe_tx_pi on car_stripe_transactions (payment_intent);
create index if not exists car_stripe_tx_store_date on car_stripe_transactions (store_id, created_at desc);
alter table car_stripe_transactions enable row level security;

-- Hasta dónde está sincronizada cada cuenta (epoch del último movimiento guardado).
create table if not exists car_stripe_sync (
  account_id text primary key,
  synced_until bigint not null default 0,
  synced_at timestamptz
);
alter table car_stripe_sync enable row level security;
