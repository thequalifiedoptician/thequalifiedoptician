-- ============================================================
-- FIX: Change currency USD -> PKR
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================

-- Step 1: Drop old USD-only constraint on orders
alter table public.orders
  drop constraint if exists orders_currency_valid;

-- Step 2: Change default from USD to PKR
alter table public.orders
  alter column currency set default 'PKR';

-- Step 3: Update any existing USD records to PKR
update public.orders
  set currency = 'PKR'
  where currency = 'USD';

-- Step 4: Add new PKR-only constraint
alter table public.orders
  add constraint orders_currency_valid check (currency = 'PKR');

-- Step 5: payments table
alter table public.payments
  alter column currency set default 'PKR';

update public.payments
  set currency = 'PKR'
  where currency = 'USD';

-- Step 6: payment_transactions table  
alter table public.payment_transactions
  alter column currency set default 'PKR';

update public.payment_transactions
  set currency = 'PKR'
  where currency = 'USD';

-- Step 7: Recreate create_order function with PKR
create or replace function public.create_order(
  p_shipping_address_id uuid,
  p_idempotency_key uuid,
  p_expected_cart jsonb
)
returns table (
  id uuid,
  order_number text,
  status text,
  currency text,
  subtotal numeric,
  shipping_amount numeric,
  tax_amount numeric,
  total numeric,
  reservation_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  existing_order public.orders%rowtype;
  shipping_snapshot jsonb;
  cart_line record;
  inventory_row public.product_inventory%rowtype;
  expected_item jsonb;
  expected_price numeric;
  expected_count integer;
  cart_count integer;
  reserved_quantity bigint;
  current_unit_price numeric(12, 2);
  current_subtotal numeric(12, 2) := 0;
  current_line_total numeric(12, 2);
  current_order_id uuid;
  current_order_number text;
  current_reservation_expires_at timestamptz;
  current_variant_label text;
begin
  if current_user_id is null then
    raise exception using message = 'ORDER_AUTH_REQUIRED';
  end if;
  if p_idempotency_key is null or p_shipping_address_id is null
    or p_expected_cart is null or jsonb_typeof(p_expected_cart) <> 'array' then
    raise exception using message = 'ORDER_VALIDATION_FAILED';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':' || p_idempotency_key::text,
      0
    )
  );

  select orders.*
  into existing_order
  from public.orders
  where orders.user_id = current_user_id
    and orders.idempotency_key = p_idempotency_key;

  if found then
    return query
      select existing_order.id,
        existing_order.order_number,
        existing_order.status,
        existing_order.currency,
        existing_order.subtotal,
        existing_order.shipping_amount,
        existing_order.tax_amount,
        existing_order.total,
        existing_order.reservation_expires_at;
    return;
  end if;

  select pg_catalog.jsonb_build_object(
    'full_name', address.full_name,
    'phone', address.phone,
    'email', address.email,
    'country', address.country,
    'region', address.region,
    'city', address.city,
    'postal_code', address.postal_code,
    'street_address', address.street_address,
    'apartment', address.apartment,
    'delivery_notes', address.delivery_notes
  )
  into shipping_snapshot
  from public.shipping_addresses as address
  where address.id = p_shipping_address_id
    and address.user_id = current_user_id;

  if shipping_snapshot is null then
    raise exception using message = 'ORDER_INVALID_ADDRESS';
  end if;

  select count(*) into expected_count
  from pg_catalog.jsonb_array_elements(p_expected_cart);

  perform 1
  from public.cart_items
  where cart_items.user_id = current_user_id
  order by cart_items.product_id, cart_items.variant_id nulls first
  for update;

  select count(*) into cart_count
  from public.cart_items
  where cart_items.user_id = current_user_id;

  if cart_count = 0 then
    raise exception using message = 'ORDER_EMPTY_CART';
  end if;
  if expected_count <> cart_count then
    raise exception using message = 'ORDER_CART_CHANGED';
  end if;

  perform 1
  from public.products
  where products.id in (
    select cart_items.product_id
    from public.cart_items
    where cart_items.user_id = current_user_id
  )
  order by products.id
  for share;

  perform 1
  from public.product_variants
  where product_variants.id in (
    select cart_items.variant_id
    from public.cart_items
    where cart_items.user_id = current_user_id
      and cart_items.variant_id is not null
  )
  order by product_variants.id
  for share;

  current_reservation_expires_at := clock_timestamp() + interval '15 minutes';
  current_order_id := gen_random_uuid();
  current_order_number := 'ALS-' ||
    pg_catalog.to_char(now(), 'YYYYMMDD') || '-' ||
    pg_catalog.upper(pg_catalog.left(
      pg_catalog.replace(current_order_id::text, '-', ''),
      12
    ));

  insert into public.orders (
    id,
    user_id,
    order_number,
    idempotency_key,
    status,
    currency,
    subtotal,
    shipping_amount,
    tax_amount,
    total,
    shipping_address_snapshot,
    reservation_expires_at
  )
  values (
    current_order_id,
    current_user_id,
    current_order_number,
    p_idempotency_key,
    'pending_payment',
    'PKR',
    0,
    0,
    0,
    0,
    shipping_snapshot,
    current_reservation_expires_at
  );

  for cart_line in
    select
      cart_items.id as cart_item_id,
      cart_items.product_id,
      cart_items.variant_id,
      cart_items.quantity,
      products.name as product_name,
      products.sku as product_sku,
      products.price as product_price,
      products.status as product_status,
      product_variants.sku as variant_sku,
      product_variants.color,
      product_variants.size,
      product_variants.material,
      product_variants.price as variant_price,
      product_variants.is_active as variant_is_active
    from public.cart_items
    left join public.products
      on products.id = cart_items.product_id
    left join public.product_variants
      on product_variants.id = cart_items.variant_id
      and product_variants.product_id = cart_items.product_id
    where cart_items.user_id = current_user_id
    order by cart_items.product_id, cart_items.variant_id nulls first
  loop
    if cart_line.product_name is null or cart_line.product_status <> 'active' then
      raise exception using message = 'ORDER_PRODUCT_UNAVAILABLE';
    end if;
    if cart_line.variant_id is not null and (
      cart_line.variant_sku is null or not coalesce(cart_line.variant_is_active, false)
    ) then
      raise exception using message = 'ORDER_INVALID_VARIANT';
    end if;
    if cart_line.variant_id is null and exists (
      select 1
      from public.product_variants
      where product_variants.product_id = cart_line.product_id
        and product_variants.is_active
    ) then
      raise exception using message = 'ORDER_INVALID_VARIANT';
    end if;
    if cart_line.quantity < 1 or cart_line.quantity > 99 then
      raise exception using message = 'ORDER_VALIDATION_FAILED';
    end if;

    current_unit_price := coalesce(cart_line.variant_price, cart_line.product_price);
    select entry
    into expected_item
    from pg_catalog.jsonb_array_elements(p_expected_cart) as item(entry)
    where item.entry->>'cart_item_id' = cart_line.cart_item_id::text;

    if expected_item is null then
      raise exception using message = 'ORDER_CART_CHANGED';
    end if;
    begin
      expected_price := (expected_item->>'unit_price')::numeric;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception using message = 'ORDER_VALIDATION_FAILED';
    end;
    if expected_price is null or expected_price <> current_unit_price then
      raise exception using message = 'ORDER_PRICE_CHANGED';
    end if;

    select *
    into inventory_row
    from public.product_inventory
    where product_inventory.product_id = cart_line.product_id
      and product_inventory.variant_id is not distinct from cart_line.variant_id
    for update;

    if not found then
      raise exception using message = 'ORDER_OUT_OF_STOCK';
    end if;

    select coalesce(sum(order_items.quantity), 0)
    into reserved_quantity
    from public.order_items
    join public.orders on orders.id = order_items.order_id
    where order_items.inventory_product_id = cart_line.product_id
      and order_items.inventory_variant_id is not distinct from cart_line.variant_id
      and orders.status = 'pending_payment'
      and orders.reservation_expires_at > clock_timestamp();

    if inventory_row.available_quantity - reserved_quantity < cart_line.quantity then
      raise exception using message = 'ORDER_OUT_OF_STOCK';
    end if;

    current_line_total := current_unit_price * cart_line.quantity;
    current_subtotal := current_subtotal + current_line_total;
    if current_subtotal > 9999999999.99 then
      raise exception using message = 'ORDER_VALIDATION_FAILED';
    end if;
    current_variant_label := nullif(
      pg_catalog.concat_ws(
        ' · ',
        cart_line.color,
        cart_line.size,
        cart_line.material
      ),
      ''
    );
-- kkki
    insert into public.order_items (
      order_id,
      product_id,
      variant_id,
      inventory_product_id,
      inventory_variant_id,
      product_name,
      sku,
      variant_label,
      quantity,
      unit_price,
      line_total
    )
    values (
      current_order_id,
      cart_line.product_id,
      cart_line.variant_id,
      cart_line.product_id,
      cart_line.variant_id,
      cart_line.product_name,
      coalesce(cart_line.variant_sku, cart_line.product_sku),
      current_variant_label,
      cart_line.quantity,
      current_unit_price,
      current_line_total
    );
  end loop;

  update public.orders
  set subtotal = current_subtotal,
    total = current_subtotal
  where orders.id = current_order_id;

  delete from public.cart_items
  where cart_items.user_id = current_user_id;

  return query
    select current_order_id,
      current_order_number,
      'pending_payment'::text,
      'PKR'::text,
      current_subtotal,
      0::numeric,
      0::numeric,
      current_subtotal,
      current_reservation_expires_at;
end;
$$;

revoke all on function public.create_order(uuid, uuid, jsonb) from public, anon;
grant execute on function public.create_order(uuid, uuid, jsonb) to authenticated;
