-- Impultienda: órdenes recibidas por webhook o importadas del Excel de "Ventas realizadas".
-- Es la única integración que guarda órdenes: Impultienda no tiene API para consultarlas
-- y el webhook solo avisa de las nuevas.

alter table car_clients
  add column if not exists impultienda_webhook_token text,
  add column if not exists impultienda_store_ids text[];

create table if not exists car_impultienda_orders (
  client_id uuid not null references car_clients(id) on delete cascade,
  order_id text not null,
  order_number integer,
  status text not null,              -- pending | approved | rejected | abandoned | refunded | chargeback
  store_id text,
  store_name text,
  total numeric,
  currency text,
  customer_email text,
  order_created_at timestamptz,
  data jsonb not null,               -- el "data" del webhook, o la fila del Excel con la misma forma
  last_event text,                   -- order.approved, xlsx-import, ...
  updated_at timestamptz not null default now(),
  primary key (client_id, order_id)
);

create index if not exists car_impultienda_orders_client_date
  on car_impultienda_orders (client_id, order_created_at desc);

-- Sin políticas: solo el servidor (secret key) lee y escribe.
alter table car_impultienda_orders enable row level security;
