create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provider_id text not null,
  method_id text not null,
  status text not null default 'pending',
  amount numeric(12, 2) not null,
  currency text not null default 'USD',
  provider_reference text,
  provider_token_reference text,
  idempotency_key uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_provider_id_valid check (
    provider_id ~ '^[a-z][a-z0-9_-]{1,63}$'
  ),
  constraint payments_method_id_valid check (
    method_id ~ '^[a-z][a-z0-9_-]{1,63}$'
  ),
  constraint payments_status_valid check (
    status in ('pending', 'processing', 'authorized', 'paid', 'failed', 'cancelled', 'refunded')
  ),
  constraint payments_amount_nonnegative check (amount >= 0),
  constraint payments_currency_valid check (currency ~ '^[A-Z]{3}$'),
  constraint payments_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint payments_order_idempotency_unique unique (order_id, idempotency_key)
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  provider_id text not null,
  status text not null,
  amount numeric(12, 2) not null,
  currency text not null,
  provider_event_id text,
  transaction_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint payment_transactions_provider_id_valid check (
    provider_id ~ '^[a-z][a-z0-9_-]{1,63}$'
  ),
  constraint payment_transactions_status_valid check (
    status in ('pending', 'processing', 'authorized', 'paid', 'failed', 'cancelled', 'refunded')
  ),
  constraint payment_transactions_amount_nonnegative check (amount >= 0),
  constraint payment_transactions_currency_valid check (currency ~ '^[A-Z]{3}$'),
  constraint payment_transactions_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists payments_order_created_idx
  on public.payments (order_id, created_at desc);
create index if not exists payments_status_created_idx
  on public.payments (status, created_at);
create unique index if not exists payments_provider_reference_unique
  on public.payments (provider_id, provider_reference)
  where provider_reference is not null;
create index if not exists payment_transactions_payment_created_idx
  on public.payment_transactions (payment_id, created_at);
create unique index if not exists payment_transactions_reference_unique
  on public.payment_transactions (provider_id, transaction_reference)
  where transaction_reference is not null;
create unique index if not exists payment_transactions_event_unique
  on public.payment_transactions (provider_id, provider_event_id)
  where provider_event_id is not null;

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.payments enable row level security;
alter table public.payment_transactions enable row level security;

revoke all on table public.payments, public.payment_transactions from anon, authenticated;
grant select (
  id,
  order_id,
  provider_id,
  method_id,
  status,
  amount,
  currency,
  provider_reference,
  idempotency_key,
  metadata,
  created_at,
  updated_at
) on public.payments to authenticated;
grant select on table public.payment_transactions to authenticated;

drop policy if exists "Users can read payments for their own orders" on public.payments;
create policy "Users can read payments for their own orders"
  on public.payments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders
      where orders.id = payments.order_id
        and orders.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can read transactions for their own payments"
  on public.payment_transactions;
create policy "Users can read transactions for their own payments"
  on public.payment_transactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.payments
      join public.orders on orders.id = payments.order_id
      where payments.id = payment_transactions.payment_id
        and orders.user_id = (select auth.uid())
    )
  );

revoke all on table public.payments, public.payment_transactions from service_role;
grant select, insert, update on table public.payments to service_role;
grant select, insert on table public.payment_transactions to service_role;
