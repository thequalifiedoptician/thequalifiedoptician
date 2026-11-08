alter table public.orders
  drop constraint if exists orders_status_valid;

alter table public.orders
  add constraint orders_status_valid check (
    status in ('pending_payment', 'confirmed', 'processing', 'cancelled', 'expired')
  );

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null default 'safepay',
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  signature_verified boolean not null,
  processing_status text not null default 'received',
  processing_attempts integer not null default 0,
  next_attempt_at timestamptz default now(),
  lease_expires_at timestamptz,
  processing_result jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint payment_events_provider_id_valid check (provider_id = 'safepay'),
  constraint payment_events_id_valid check (
    length(provider_event_id) between 1 and 200
  ),
  constraint payment_events_type_valid check (
    length(event_type) between 1 and 120
  ),
  constraint payment_events_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint payment_events_status_valid check (
    processing_status in ('received', 'processing', 'processed', 'ignored', 'failed')
  ),
  constraint payment_events_attempts_valid check (processing_attempts >= 0),
  constraint payment_events_result_object check (jsonb_typeof(processing_result) = 'object'),
  constraint payment_events_provider_event_unique unique (provider_id, provider_event_id)
);

create index if not exists payment_events_pending_idx
  on public.payment_events (next_attempt_at, created_at)
  where processing_status in ('received', 'failed');
create index if not exists payment_events_expired_lease_idx
  on public.payment_events (lease_expires_at)
  where processing_status = 'processing';

drop trigger if exists payment_events_set_updated_at on public.payment_events;
create trigger payment_events_set_updated_at
  before update on public.payment_events
  for each row execute function public.set_updated_at();

alter table public.payment_events enable row level security;
revoke all on table public.payment_events from public, anon, authenticated, service_role;
revoke select (provider_reference, provider_token_reference)
  on public.payments from authenticated;
revoke select on table public.payment_transactions from authenticated;
grant select (
  id,
  payment_id,
  provider_id,
  status,
  amount,
  currency,
  provider_event_id,
  metadata,
  created_at
) on public.payment_transactions to authenticated;

create or replace function public.record_safepay_webhook_event(
  p_provider_event_id text,
  p_event_type text,
  p_payload jsonb
)
returns table (
  event_row_id uuid,
  is_duplicate boolean,
  current_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_id uuid;
  existing_status text;
begin
  if p_provider_event_id is null or length(p_provider_event_id) not between 1 and 200
    or p_event_type is null or length(p_event_type) not between 1 and 120
    or p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or p_payload->>'token' is distinct from p_provider_event_id
    or p_payload->>'type' is distinct from p_event_type then
    raise exception using message = 'INVALID_SAFEPAY_EVENT';
  end if;

  insert into public.payment_events (
    provider_id,
    provider_event_id,
    event_type,
    payload,
    signature_verified
  )
  values (
    'safepay',
    p_provider_event_id,
    p_event_type,
    p_payload,
    true
  )
  on conflict (provider_id, provider_event_id) do nothing
  returning id into inserted_id;

  if inserted_id is not null then
    return query select inserted_id, false, 'received'::text;
    return;
  end if;

  select events.id, events.processing_status
  into event_row_id, existing_status
  from public.payment_events as events
  where events.provider_id = 'safepay'
    and events.provider_event_id = p_provider_event_id;

  if not found then
    raise exception using message = 'SAFEPAY_EVENT_PERSISTENCE_FAILED';
  end if;

  return query select event_row_id, true, existing_status;
end;
$$;

create or replace function public.claim_safepay_webhook_event()
returns table (
  event_row_id uuid,
  provider_event_id text,
  event_type text,
  payload jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_id uuid;
begin
  select events.id
  into candidate_id
  from public.payment_events as events
  where events.signature_verified
    and events.processing_attempts < 8
    and (
      (
        events.processing_status in ('received', 'failed')
        and events.next_attempt_at <= now()
      )
      or (
        events.processing_status = 'processing'
        and events.lease_expires_at <= now()
      )
    )
  order by events.created_at
  for update skip locked
  limit 1;

  if candidate_id is null then
    return;
  end if;

  return query
  update public.payment_events as events
  set processing_status = 'processing',
      processing_attempts = events.processing_attempts + 1,
      lease_expires_at = now() + interval '1 minute',
      last_error = null
  where events.id = candidate_id
  returning events.id, events.provider_event_id, events.event_type, events.payload;
end;
$$;

create or replace function public.process_safepay_webhook_event(p_event_row_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_row public.payment_events%rowtype;
  payment_row public.payments%rowtype;
  order_row public.orders%rowtype;
  event_data jsonb;
  event_kind text;
  tracker text;
  matched_payment_id uuid;
  is_current_attempt boolean;
  event_amount numeric;
  event_currency text;
  inventory_item record;
  inventory_row public.product_inventory%rowtype;
  inventory_available boolean := true;
  result_value jsonb;
begin
  select events.*
  into event_row
  from public.payment_events as events
  where events.id = p_event_row_id
  for update;

  if not found or event_row.processing_status <> 'processing'
    or not event_row.signature_verified then
    return jsonb_build_object('result', 'not_claimed');
  end if;

  event_kind := event_row.event_type;
  event_data := event_row.payload->'data';

  if event_kind not in (
    'payment.succeeded',
    'payment.failed',
    'authorization.succeeded',
    'authorization.reversed'
  ) then
    update public.payment_events
    set processing_status = 'ignored',
        lease_expires_at = null,
        processed_at = now(),
        processing_result = jsonb_build_object('result', 'unsupported_event_type')
    where id = event_row.id;
    return jsonb_build_object('result', 'ignored');
  end if;

  if jsonb_typeof(event_data) <> 'object' then
    raise exception using message = 'INVALID_SAFEPAY_EVENT_DATA';
  end if;

  tracker := event_data->>'tracker';
  if tracker is null or length(tracker) not between 1 and 200 then
    raise exception using message = 'INVALID_SAFEPAY_TRACKER';
  end if;

  select transactions.payment_id
  into matched_payment_id
  from public.payment_transactions as transactions
  where transactions.provider_id = 'safepay'
    and transactions.transaction_reference = tracker;

  if found then
    select payments.*
    into payment_row
    from public.payments as payments
    where payments.id = matched_payment_id
      and payments.provider_id = 'safepay'
    for update;
  else
    select payments.*
    into payment_row
    from public.payments as payments
    where payments.provider_id = 'safepay'
      and payments.provider_reference = tracker
    for update;
  end if;

  if not found then
    raise exception using message = 'SAFEPAY_PAYMENT_NOT_FOUND';
  end if;

  select orders.*
  into order_row
  from public.orders as orders
  where orders.id = payment_row.order_id
  for update;

  if not found then
    raise exception using message = 'SAFEPAY_ORDER_NOT_FOUND';
  end if;

  if event_kind in ('payment.succeeded', 'authorization.succeeded') then
    begin
      event_amount := (event_data->>'amount')::numeric;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception using message = 'INVALID_SAFEPAY_AMOUNT';
    end;
    event_currency := event_data->>'currency';

    if event_amount is null or event_amount <> payment_row.amount
      or event_currency is distinct from payment_row.currency then
      raise exception using message = 'SAFEPAY_PAYMENT_AMOUNT_MISMATCH';
    end if;
  else
    event_amount := payment_row.amount;
    event_currency := payment_row.currency;
  end if;
  is_current_attempt := payment_row.provider_reference is not distinct from tracker;

  if event_kind = 'payment.succeeded' then
    update public.payments
    set status = 'paid'
    where id = payment_row.id;

    if order_row.status = 'pending_payment' then
      if not exists (
        select 1
        from public.order_items as items
        where items.order_id = order_row.id
      ) then
        inventory_available := false;
      end if;

      for inventory_item in
        select items.inventory_product_id, items.inventory_variant_id, items.quantity
        from public.order_items as items
        where items.order_id = order_row.id
        order by items.inventory_product_id, items.inventory_variant_id nulls first
      loop
        select inventory.*
        into inventory_row
        from public.product_inventory as inventory
        where inventory.product_id = inventory_item.inventory_product_id
          and inventory.variant_id is not distinct from inventory_item.inventory_variant_id
        for update;

        if not found
          or inventory_row.quantity_on_hand - inventory_row.quantity_reserved
            < inventory_item.quantity then
          inventory_available := false;
          exit;
        end if;
      end loop;

      if inventory_available then
        for inventory_item in
          select items.inventory_product_id, items.inventory_variant_id, items.quantity
          from public.order_items as items
          where items.order_id = order_row.id
          order by items.inventory_product_id, items.inventory_variant_id nulls first
        loop
          update public.product_inventory as inventory
          set quantity_on_hand = inventory.quantity_on_hand - inventory_item.quantity
          where inventory.product_id = inventory_item.inventory_product_id
            and inventory.variant_id is not distinct from inventory_item.inventory_variant_id;
        end loop;

        update public.orders
        set status = 'confirmed'
        where id = order_row.id and status = 'pending_payment';

        update public.orders
        set status = 'processing'
        where id = order_row.id and status = 'confirmed';

        result_value := jsonb_build_object(
          'result',
          'paid_order_processing_inventory_deducted'
        );
      else
        update public.orders
        set status = 'confirmed'
        where id = order_row.id and status = 'pending_payment';

        result_value := jsonb_build_object(
          'result',
          'paid_order_inventory_shortfall_requires_reconciliation'
        );
      end if;
    elsif order_row.status in ('confirmed', 'processing') then
      result_value := jsonb_build_object(
        'result',
        'paid_payment_for_already_advanced_order_requires_reconciliation'
      );
    else
      result_value := jsonb_build_object(
        'result',
        'paid_payment_for_inactive_order_requires_reconciliation'
      );
    end if;
  elsif event_kind = 'payment.failed' then
    if not is_current_attempt then
      result_value := jsonb_build_object('result', 'stale_payment_attempt_ignored');
    elsif payment_row.status <> 'paid' then
      update public.payments
      set status = 'failed'
      where id = payment_row.id;
      result_value := jsonb_build_object('result', 'payment_failed');
    else
      result_value := jsonb_build_object('result', 'payment_failure_after_paid_ignored');
    end if;
  elsif event_kind = 'authorization.succeeded' then
    if not is_current_attempt then
      result_value := jsonb_build_object('result', 'stale_payment_attempt_ignored');
    elsif payment_row.status not in ('paid', 'failed', 'cancelled', 'refunded') then
      update public.payments
      set status = 'authorized'
      where id = payment_row.id;
      result_value := jsonb_build_object('result', 'payment_authorized');
    else
      result_value := jsonb_build_object('result', 'authorization_for_terminal_payment_ignored');
    end if;
  else
    if not is_current_attempt then
      result_value := jsonb_build_object('result', 'stale_payment_attempt_ignored');
    elsif payment_row.status not in ('paid', 'refunded') then
      update public.payments
      set status = 'cancelled'
      where id = payment_row.id;
      result_value := jsonb_build_object('result', 'authorization_reversed');
    else
      result_value := jsonb_build_object('result', 'authorization_reversal_for_terminal_payment_ignored');
    end if;
  end if;

  insert into public.payment_transactions (
    payment_id,
    provider_id,
    status,
    amount,
    currency,
    provider_event_id,
    metadata
  )
  values (
    payment_row.id,
    'safepay',
    case event_kind
      when 'payment.succeeded' then 'paid'
      when 'payment.failed' then 'failed'
      when 'authorization.succeeded' then 'authorized'
      else 'cancelled'
    end,
    event_amount,
    event_currency,
    event_row.provider_event_id,
    jsonb_build_object('event_type', event_kind, 'result', result_value->>'result')
  )
  on conflict do nothing;

  if result_value->>'result' in (
    'paid_order_inventory_shortfall_requires_reconciliation',
    'paid_payment_for_inactive_order_requires_reconciliation',
    'paid_payment_for_already_advanced_order_requires_reconciliation'
  ) then
    update public.payment_events
    set processing_status = 'failed',
        lease_expires_at = null,
        next_attempt_at = null,
        last_error = result_value->>'result',
        processing_result = result_value
    where id = event_row.id;
  else
    update public.payment_events
    set processing_status = 'processed',
        lease_expires_at = null,
        processed_at = now(),
        last_error = null,
        processing_result = result_value
    where id = event_row.id;
  end if;

  return result_value;
end;
$$;

create or replace function public.retry_safepay_webhook_event(
  p_event_row_id uuid,
  p_error_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_row public.payment_events%rowtype;
begin
  select events.*
  into event_row
  from public.payment_events as events
  where events.id = p_event_row_id
  for update;

  if not found or event_row.processing_status <> 'processing' then
    return;
  end if;

  update public.payment_events
  set processing_status = case
        when event_row.processing_attempts >= 8 then 'failed'
        else 'received'
      end,
      next_attempt_at = case
        when event_row.processing_attempts >= 8 then null
        else now() + make_interval(secs => least(3600, 5 * (2 ^ (event_row.processing_attempts - 1))::integer))
      end,
      lease_expires_at = null,
      last_error = left(coalesce(p_error_code, 'WEBHOOK_PROCESSING_FAILED'), 120)
  where id = p_event_row_id;
end;
$$;

revoke all on function public.record_safepay_webhook_event(text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.claim_safepay_webhook_event()
  from public, anon, authenticated;
revoke all on function public.process_safepay_webhook_event(uuid)
  from public, anon, authenticated;
revoke all on function public.retry_safepay_webhook_event(uuid, text)
  from public, anon, authenticated;

grant execute on function public.record_safepay_webhook_event(text, text, jsonb)
  to service_role;
grant execute on function public.claim_safepay_webhook_event()
  to service_role;
grant execute on function public.process_safepay_webhook_event(uuid)
  to service_role;
grant execute on function public.retry_safepay_webhook_event(uuid, text)
  to service_role;
