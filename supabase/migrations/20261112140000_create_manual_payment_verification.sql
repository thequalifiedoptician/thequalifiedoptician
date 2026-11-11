create table if not exists public.payment_accounts (
  id integer primary key default 1 check (id = 1),
  easypaisa_holder_name text not null default '',
  easypaisa_mobile_number text not null default '',
  easypaisa_qr_path text,
  enable_easypaisa boolean not null default false,
  jazzcash_holder_name text not null default '',
  jazzcash_mobile_number text not null default '',
  jazzcash_qr_path text,
  enable_jazzcash boolean not null default false,
  bank_name text not null default '',
  bank_account_holder text not null default '',
  bank_iban text not null default '',
  bank_account_number text not null default '',
  bank_qr_path text,
  enable_bank_transfer boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.payment_accounts (id)
values (1)
on conflict (id) do nothing;

alter table public.payment_accounts enable row level security;
revoke all on table public.payment_accounts from public, anon, authenticated;
grant select on table public.payment_accounts to anon, authenticated;
grant insert, update, delete on table public.payment_accounts to authenticated;

drop policy if exists "Public can read payment account details" on public.payment_accounts;
create policy "Public can read payment account details"
  on public.payment_accounts
  for select
  to anon, authenticated
  using (id = 1);

drop policy if exists "Admins can manage payment accounts" on public.payment_accounts;
create policy "Admins can manage payment accounts"
  on public.payment_accounts
  for all
  to authenticated
  using ((select public.is_catalog_admin()))
  with check ((select public.is_catalog_admin()));

drop trigger if exists payment_accounts_set_updated_at on public.payment_accounts;
create trigger payment_accounts_set_updated_at
  before update on public.payment_accounts
  for each row execute function public.set_updated_at();

create table if not exists public.manual_payment_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  customer_id uuid not null references auth.users (id) on delete restrict,
  payment_id uuid not null references public.payments (id) on delete restrict,
  payment_method text not null,
  account_used jsonb not null,
  transaction_reference text,
  payment_screenshot_url text,
  uploaded_at timestamptz,
  verification_status text not null default 'awaiting_payment',
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint manual_payment_method_valid check (payment_method in ('easypaisa', 'jazzcash')),
  constraint manual_payment_account_snapshot_object check (jsonb_typeof(account_used) = 'object'),
  constraint manual_payment_transaction_reference_length check (
    transaction_reference is null or length(transaction_reference) <= 120
  ),
  constraint manual_payment_screenshot_path_length check (
    payment_screenshot_url is null or length(payment_screenshot_url) <= 500
  ),
  constraint manual_payment_verification_status_valid check (
    verification_status in (
      'awaiting_payment',
      'pending_verification',
      'approved',
      'rejected',
      'reupload_requested'
    )
  ),
  constraint manual_payment_admin_note_length check (
    admin_note is null or length(admin_note) <= 1000
  )
);

create index if not exists manual_payment_proofs_status_uploaded_idx
  on public.manual_payment_proofs (verification_status, uploaded_at desc);
create index if not exists manual_payment_proofs_customer_uploaded_idx
  on public.manual_payment_proofs (customer_id, uploaded_at desc);

drop trigger if exists manual_payment_proofs_set_updated_at on public.manual_payment_proofs;
create trigger manual_payment_proofs_set_updated_at
  before update on public.manual_payment_proofs
  for each row execute function public.set_updated_at();

alter table public.manual_payment_proofs enable row level security;
revoke all on table public.manual_payment_proofs from public, anon, authenticated;
grant select on table public.manual_payment_proofs to authenticated;

drop policy if exists "Customers and admins can read manual payment proofs"
  on public.manual_payment_proofs;
create policy "Customers and admins can read manual payment proofs"
  on public.manual_payment_proofs
  for select
  to authenticated
  using (
    customer_id = (select auth.uid())
    or (select public.is_catalog_admin())
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'payment-account-qr',
  'payment-account-qr',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read payment account QR codes" on storage.objects;
create policy "Public can read payment account QR codes"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'payment-account-qr');

drop policy if exists "Admins can upload payment account QR codes" on storage.objects;
create policy "Admins can upload payment account QR codes"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'payment-account-qr'
    and (select public.is_catalog_admin())
  );

drop policy if exists "Admins can update payment account QR codes" on storage.objects;
create policy "Admins can update payment account QR codes"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'payment-account-qr'
    and (select public.is_catalog_admin())
  )
  with check (
    bucket_id = 'payment-account-qr'
    and (select public.is_catalog_admin())
  );

drop policy if exists "Admins can delete payment account QR codes" on storage.objects;
create policy "Admins can delete payment account QR codes"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'payment-account-qr'
    and (select public.is_catalog_admin())
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'manual-payment-proofs',
  'manual-payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Customers and admins can read payment proof files" on storage.objects;
create policy "Customers and admins can read payment proof files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'manual-payment-proofs'
    and (
      (select public.is_catalog_admin())
      or (
        (storage.foldername(name))[1] = (select auth.uid())::text
        and exists (
          select 1
          from public.orders
          where orders.id::text = (storage.foldername(name))[2]
            and orders.user_id = (select auth.uid())
        )
      )
    )
  );

drop policy if exists "Customers can upload their own payment proof files" on storage.objects;
create policy "Customers can upload their own payment proof files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'manual-payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.orders
      where orders.id::text = (storage.foldername(name))[2]
        and orders.user_id = (select auth.uid())
        and orders.status = 'pending_payment'
        and orders.reservation_expires_at > now()
    )
  );

drop policy if exists "Customers can delete their own payment proof files" on storage.objects;
create policy "Customers can delete their own payment proof files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'manual-payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.orders
      where orders.id::text = (storage.foldername(name))[2]
        and orders.user_id = (select auth.uid())
    )
  );

create or replace function public.prepare_manual_payment(
  p_order_id uuid,
  p_payment_method text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  order_row public.orders%rowtype;
  account_row public.payment_accounts%rowtype;
  payment_id uuid;
  proof_id uuid;
  payment_key uuid;
  account_snapshot jsonb;
begin
  if current_user_id is null then
    raise exception using message = 'AUTH_REQUIRED';
  end if;

  if p_payment_method is null or p_payment_method not in ('easypaisa', 'jazzcash') then
    raise exception using message = 'INVALID_MANUAL_PAYMENT_METHOD';
  end if;

  select orders.*
  into order_row
  from public.orders as orders
  where orders.id = p_order_id
    and orders.user_id = current_user_id
  for update;

  if not found or order_row.status <> 'pending_payment'
    or order_row.reservation_expires_at <= now() then
    raise exception using message = 'INVALID_MANUAL_PAYMENT_ORDER';
  end if;

  if exists (
    select 1
    from public.payments as payments
    where payments.order_id = order_row.id
      and payments.method_id <> p_payment_method
      and payments.status not in ('failed', 'cancelled', 'refunded')
  ) then
    raise exception using message = 'MANUAL_PAYMENT_METHOD_CONFLICT';
  end if;

  select accounts.*
  into account_row
  from public.payment_accounts as accounts
  where accounts.id = 1;

  if not found
    or (p_payment_method = 'easypaisa' and not account_row.enable_easypaisa)
    or (p_payment_method = 'jazzcash' and not account_row.enable_jazzcash) then
    raise exception using message = 'MANUAL_PAYMENT_METHOD_DISABLED';
  end if;

  if p_payment_method = 'easypaisa' then
    if btrim(account_row.easypaisa_holder_name) = ''
      or btrim(account_row.easypaisa_mobile_number) = '' then
      raise exception using message = 'MANUAL_PAYMENT_ACCOUNT_INCOMPLETE';
    end if;
    account_snapshot := jsonb_build_object(
      'holder_name', account_row.easypaisa_holder_name,
      'mobile_number', account_row.easypaisa_mobile_number,
      'qr_path', account_row.easypaisa_qr_path
    );
  else
    if btrim(account_row.jazzcash_holder_name) = ''
      or btrim(account_row.jazzcash_mobile_number) = '' then
      raise exception using message = 'MANUAL_PAYMENT_ACCOUNT_INCOMPLETE';
    end if;
    account_snapshot := jsonb_build_object(
      'holder_name', account_row.jazzcash_holder_name,
      'mobile_number', account_row.jazzcash_mobile_number,
      'qr_path', account_row.jazzcash_qr_path
    );
  end if;

  payment_key := md5(order_row.id::text || ':manual:' || p_payment_method)::uuid;

  insert into public.payments (
    order_id,
    provider_id,
    method_id,
    status,
    amount,
    currency,
    idempotency_key,
    metadata
  )
  values (
    order_row.id,
    p_payment_method,
    p_payment_method,
    'pending',
    order_row.total,
    order_row.currency,
    payment_key,
    '{}'::jsonb
  )
  on conflict (order_id, idempotency_key) do nothing
  returning id into payment_id;

  if payment_id is null then
    select payments.id
    into payment_id
    from public.payments as payments
    where payments.order_id = order_row.id
      and payments.idempotency_key = payment_key
      and payments.provider_id = p_payment_method
      and payments.method_id = p_payment_method;
    if payment_id is null then
      raise exception using message = 'MANUAL_PAYMENT_METHOD_CONFLICT';
    end if;
  end if;

  insert into public.manual_payment_proofs (
    order_id,
    customer_id,
    payment_id,
    payment_method,
    account_used
  )
  values (
    order_row.id,
    current_user_id,
    payment_id,
    p_payment_method,
    account_snapshot
  )
  on conflict (order_id) do nothing
  returning id into proof_id;

  if proof_id is null then
    select proofs.id
    into proof_id
    from public.manual_payment_proofs as proofs
    where proofs.order_id = order_row.id
      and proofs.customer_id = current_user_id
      and proofs.payment_id = payment_id
      and proofs.payment_method = p_payment_method;
    if proof_id is null then
      raise exception using message = 'MANUAL_PAYMENT_METHOD_CONFLICT';
    end if;
  end if;

  update public.orders
  set reservation_expires_at = greatest(
    order_row.reservation_expires_at,
    order_row.created_at + interval '24 hours'
  )
  where id = order_row.id;

  return proof_id;
end;
$$;

revoke all on function public.prepare_manual_payment(uuid, text) from public, anon;
grant execute on function public.prepare_manual_payment(uuid, text) to authenticated;

create or replace function public.submit_manual_payment_proof(
  p_proof_id uuid,
  p_storage_path text,
  p_transaction_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  proof_row public.manual_payment_proofs%rowtype;
  order_row public.orders%rowtype;
begin
  if current_user_id is null then
    raise exception using message = 'AUTH_REQUIRED';
  end if;

  if p_storage_path is null
    or length(p_storage_path) > 500
    or p_storage_path !~ (
      '^' || current_user_id::text || '/[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpe?g|webp)$'
    )
    or p_transaction_reference is not null
      and length(p_transaction_reference) > 120 then
    raise exception using message = 'INVALID_PAYMENT_PROOF';
  end if;

  select proofs.*
  into proof_row
  from public.manual_payment_proofs as proofs
  where proofs.id = p_proof_id
    and proofs.customer_id = current_user_id
  for update;

  if not found
    or proof_row.verification_status not in (
      'awaiting_payment',
      'rejected',
      'reupload_requested'
    ) then
    raise exception using message = 'PAYMENT_PROOF_NOT_ACCEPTED';
  end if;

  if split_part(p_storage_path, '/', 2) <> proof_row.order_id::text then
    raise exception using message = 'INVALID_PAYMENT_PROOF';
  end if;

  select orders.*
  into order_row
  from public.orders as orders
  where orders.id = proof_row.order_id
    and orders.user_id = current_user_id
  for update;

  if not found or order_row.status <> 'pending_payment'
    or order_row.reservation_expires_at <= now() then
    raise exception using message = 'INVALID_MANUAL_PAYMENT_ORDER';
  end if;

  if not exists (
    select 1
    from storage.objects
    where storage.objects.bucket_id = 'manual-payment-proofs'
      and storage.objects.name = p_storage_path
  ) then
    raise exception using message = 'PAYMENT_PROOF_FILE_NOT_FOUND';
  end if;

  update public.manual_payment_proofs
  set payment_screenshot_url = p_storage_path,
      transaction_reference = nullif(btrim(p_transaction_reference), ''),
      uploaded_at = now(),
      verification_status = 'pending_verification',
      verified_by = null,
      verified_at = null,
      admin_note = null
  where id = proof_row.id;

  update public.payments
  set status = 'pending'
  where id = proof_row.payment_id
    and status <> 'paid';

  return proof_row.id;
end;
$$;

revoke all on function public.submit_manual_payment_proof(uuid, text, text)
  from public, anon;
grant execute on function public.submit_manual_payment_proof(uuid, text, text)
  to authenticated;

create or replace function public.record_cash_on_delivery(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  order_row public.orders%rowtype;
  payment_id uuid;
  payment_key uuid;
begin
  if current_user_id is null then
    raise exception using message = 'AUTH_REQUIRED';
  end if;

  select orders.*
  into order_row
  from public.orders as orders
  where orders.id = p_order_id
    and orders.user_id = current_user_id
  for update;

  if not found then
    raise exception using message = 'INVALID_COD_ORDER';
  end if;

  payment_key := md5(order_row.id::text || ':manual:cash_on_delivery')::uuid;

  select payments.id
  into payment_id
  from public.payments as payments
  where payments.order_id = order_row.id
    and payments.idempotency_key = payment_key
    and payments.provider_id = 'cash_on_delivery'
    and payments.method_id = 'cash_on_delivery';

  if payment_id is not null and order_row.status = 'processing' then
    return payment_id;
  end if;

  if order_row.status <> 'pending_payment'
    or order_row.reservation_expires_at <= now() then
    raise exception using message = 'INVALID_COD_ORDER';
  end if;

  if exists (
    select 1
    from public.payments as payments
    where payments.order_id = order_row.id
      and payments.method_id <> 'cash_on_delivery'
      and payments.status not in ('failed', 'cancelled', 'refunded')
  ) then
    raise exception using message = 'MANUAL_PAYMENT_METHOD_CONFLICT';
  end if;

  insert into public.payments (
    order_id,
    provider_id,
    method_id,
    status,
    amount,
    currency,
    idempotency_key,
    metadata
  )
  values (
    order_row.id,
    'cash_on_delivery',
    'cash_on_delivery',
    'pending',
    order_row.total,
    order_row.currency,
    payment_key,
    '{}'::jsonb
  )
  on conflict (order_id, idempotency_key) do nothing
  returning id into payment_id;

  if payment_id is null then
    select payments.id
    into payment_id
    from public.payments as payments
    where payments.order_id = order_row.id
      and payments.idempotency_key = payment_key
      and payments.provider_id = 'cash_on_delivery'
      and payments.method_id = 'cash_on_delivery';
    if payment_id is null then
      raise exception using message = 'MANUAL_PAYMENT_METHOD_CONFLICT';
    end if;
  end if;

  perform public.fulfill_manual_payment_order(order_row.id);
  return payment_id;
end;
$$;

create or replace function public.fulfill_manual_payment_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  inventory_item record;
  inventory_row public.product_inventory%rowtype;
  other_reserved bigint;
  inventory_missing boolean;
begin
  if not exists (
    select 1
    from public.order_items
    where order_items.order_id = p_order_id
  ) then
    raise exception using message = 'MANUAL_PAYMENT_ORDER_HAS_NO_ITEMS';
  end if;

  for inventory_item in
    select items.inventory_product_id, items.inventory_variant_id, sum(items.quantity)::bigint as quantity
    from public.order_items as items
    where items.order_id = p_order_id
    group by items.inventory_product_id, items.inventory_variant_id
    order by items.inventory_product_id, items.inventory_variant_id nulls first
  loop
    select inventory.*
    into inventory_row
    from public.product_inventory as inventory
    where inventory.product_id = inventory_item.inventory_product_id
      and inventory.variant_id is not distinct from inventory_item.inventory_variant_id
    for update;
    inventory_missing := not found;

    select coalesce(sum(items.quantity), 0)
    into other_reserved
    from public.order_items as items
    join public.orders as orders on orders.id = items.order_id
    where items.inventory_product_id = inventory_item.inventory_product_id
      and items.inventory_variant_id is not distinct from inventory_item.inventory_variant_id
      and orders.id <> p_order_id
      and orders.status = 'pending_payment'
      and orders.reservation_expires_at > now();

    if inventory_missing
      or inventory_row.quantity_on_hand - inventory_row.quantity_reserved - other_reserved
        < inventory_item.quantity then
      raise exception using message = 'MANUAL_PAYMENT_OUT_OF_STOCK';
    end if;
  end loop;

  for inventory_item in
    select items.inventory_product_id, items.inventory_variant_id, sum(items.quantity)::bigint as quantity
    from public.order_items as items
    where items.order_id = p_order_id
    group by items.inventory_product_id, items.inventory_variant_id
    order by items.inventory_product_id, items.inventory_variant_id nulls first
  loop
    update public.product_inventory as inventory
    set quantity_on_hand = inventory.quantity_on_hand - inventory_item.quantity
    where inventory.product_id = inventory_item.inventory_product_id
      and inventory.variant_id is not distinct from inventory_item.inventory_variant_id;
  end loop;

  update public.orders
  set status = 'processing'
  where id = p_order_id
    and status = 'pending_payment';

  if not found then
    raise exception using message = 'MANUAL_PAYMENT_ORDER_NOT_PENDING';
  end if;
end;
$$;

revoke all on function public.fulfill_manual_payment_order(uuid) from public, anon, authenticated;
revoke all on function public.record_cash_on_delivery(uuid) from public, anon;
grant execute on function public.record_cash_on_delivery(uuid) to authenticated;

create or replace function public.verify_manual_payment_proof(
  p_proof_id uuid,
  p_action text,
  p_admin_note text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  proof_row public.manual_payment_proofs%rowtype;
  order_row public.orders%rowtype;
begin
  if not (select public.is_catalog_admin()) then
    raise exception using message = 'ADMIN_REQUIRED';
  end if;

  if p_action is null
    or p_action not in ('approve', 'reject', 'request_reupload')
    or p_admin_note is not null and length(p_admin_note) > 1000 then
    raise exception using message = 'INVALID_MANUAL_PAYMENT_REVIEW';
  end if;

  select proofs.*
  into proof_row
  from public.manual_payment_proofs as proofs
  where proofs.id = p_proof_id
  for update;

  if not found or proof_row.verification_status <> 'pending_verification'
    or proof_row.payment_screenshot_url is null then
    raise exception using message = 'PAYMENT_PROOF_NOT_PENDING';
  end if;

  select orders.*
  into order_row
  from public.orders as orders
  where orders.id = proof_row.order_id
  for update;

  if not found or order_row.status <> 'pending_payment' then
    raise exception using message = 'INVALID_MANUAL_PAYMENT_ORDER';
  end if;

  if p_action = 'approve' then
    perform public.fulfill_manual_payment_order(order_row.id);
    update public.payments
    set status = 'paid'
    where id = proof_row.payment_id;
    update public.manual_payment_proofs
    set verification_status = 'approved',
        verified_by = (select auth.uid()),
        verified_at = now(),
        admin_note = nullif(btrim(p_admin_note), '')
    where id = proof_row.id;
    return 'approved';
  end if;

  update public.payments
  set status = 'failed'
  where id = proof_row.payment_id
    and status <> 'paid';

  update public.manual_payment_proofs
  set verification_status = case
        when p_action = 'reject' then 'rejected'
        else 'reupload_requested'
      end,
      verified_by = (select auth.uid()),
      verified_at = now(),
      admin_note = nullif(btrim(p_admin_note), '')
  where id = proof_row.id;

  return case when p_action = 'reject' then 'rejected' else 'reupload_requested' end;
end;
$$;

revoke all on function public.verify_manual_payment_proof(uuid, text, text)
  from public, anon;
grant execute on function public.verify_manual_payment_proof(uuid, text, text)
  to authenticated;

create or replace function public.get_manual_payment_dashboard_metrics()
returns table (
  pending_count bigint,
  approved_today bigint,
  rejected_count bigint,
  total_manual_payments bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not (select public.is_catalog_admin()) then
    raise exception using message = 'ADMIN_REQUIRED';
  end if;

  return query
  select
    count(*) filter (where proofs.verification_status = 'pending_verification')::bigint,
    count(*) filter (
      where proofs.verification_status = 'approved'
        and proofs.verified_at >= date_trunc('day', now())
    )::bigint,
    count(*) filter (
      where proofs.verification_status in ('rejected', 'reupload_requested')
    )::bigint,
    count(*) filter (where proofs.uploaded_at is not null)::bigint
  from public.manual_payment_proofs as proofs;
end;
$$;

revoke all on function public.get_manual_payment_dashboard_metrics() from public, anon;
grant execute on function public.get_manual_payment_dashboard_metrics() to authenticated;
