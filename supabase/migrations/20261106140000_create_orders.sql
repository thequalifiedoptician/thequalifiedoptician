create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  order_number text not null unique,
  idempotency_key uuid not null,
  status text not null default 'pending_payment',
  currency text not null default 'USD',
  subtotal numeric(12, 2) not null,
  shipping_amount numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  shipping_address_snapshot jsonb not null,
  reservation_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_status_valid check (
    status in ('pending_payment', 'cancelled', 'expired')
  ),
  constraint orders_currency_valid check (currency = 'USD'),
  constraint orders_amounts_nonnegative check (
    subtotal >= 0 and shipping_amount >= 0 and tax_amount >= 0 and total >= 0
  ),
  constraint orders_total_matches_amounts check (
    total = subtotal + shipping_amount + tax_amount
  ),
  constraint orders_address_snapshot_object check (
    jsonb_typeof(shipping_address_snapshot) = 'object'
  ),
  constraint orders_user_idempotency_unique unique (user_id, idempotency_key)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  inventory_product_id uuid not null,
  inventory_variant_id uuid,
  product_name text not null,
  sku text not null,
  variant_label text,
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  line_total numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint order_items_quantity_valid check (quantity between 1 and 99),
  constraint order_items_amounts_nonnegative check (
    unit_price >= 0 and line_total >= 0
  ),
  constraint order_items_total_matches_quantity check (
    line_total = unit_price * quantity
  )
);

create index if not exists orders_user_created_idx
  on public.orders (user_id, created_at desc);
create index if not exists orders_active_reservation_expiry_idx
  on public.orders (reservation_expires_at)
  where status = 'pending_payment';
create index if not exists order_items_order_created_idx
  on public.order_items (order_id, created_at);
create index if not exists order_items_inventory_lookup_idx
  on public.order_items (inventory_product_id, inventory_variant_id, order_id);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on table public.orders, public.order_items from anon, authenticated;
grant select on table public.orders, public.order_items to authenticated;

drop policy if exists "Users can read their own orders" on public.orders;
create policy "Users can read their own orders"
  on public.orders
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read items from their own orders" on public.order_items;
create policy "Users can read items from their own orders"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = (select auth.uid())
    )
  );

create or replace function public.get_public_product_availability(p_product_ids uuid[])
returns table (
  product_id uuid,
  in_stock boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    products.id,
    coalesce(
      sum(
        greatest(
          inventory.available_quantity - coalesce(active_orders.reserved_quantity, 0),
          0
        )
      ),
      0
    ) > 0
  from public.products as products
  left join public.product_inventory as inventory
    on inventory.product_id = products.id
  left join lateral (
    select sum(order_items.quantity) as reserved_quantity
    from public.order_items
    join public.orders on orders.id = order_items.order_id
    where order_items.inventory_product_id = inventory.product_id
      and order_items.inventory_variant_id is not distinct from inventory.variant_id
      and orders.status = 'pending_payment'
      and orders.reservation_expires_at > now()
  ) as active_orders on true
  where products.status = 'active'
    and products.id = any(p_product_ids)
  group by products.id;
$$;

revoke all on function public.get_public_product_availability(uuid[]) from public;
grant execute on function public.get_public_product_availability(uuid[]) to anon, authenticated;

create or replace function public.get_public_variant_availability(p_variant_ids uuid[])
returns table (
  variant_id uuid,
  in_stock boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    variants.id,
    coalesce(
      sum(
        greatest(
          inventory.available_quantity - coalesce(active_orders.reserved_quantity, 0),
          0
        )
      ),
      0
    ) > 0
  from public.product_variants as variants
  join public.products as products
    on products.id = variants.product_id
  left join public.product_inventory as inventory
    on inventory.variant_id = variants.id
    and inventory.product_id = variants.product_id
  left join lateral (
    select sum(order_items.quantity) as reserved_quantity
    from public.order_items
    join public.orders on orders.id = order_items.order_id
    where order_items.inventory_product_id = inventory.product_id
      and order_items.inventory_variant_id is not distinct from inventory.variant_id
      and orders.status = 'pending_payment'
      and orders.reservation_expires_at > now()
  ) as active_orders on true
  where variants.id = any(p_variant_ids)
    and variants.is_active
    and products.status = 'active'
  group by variants.id;
$$;

revoke all on function public.get_public_variant_availability(uuid[]) from public;
grant execute on function public.get_public_variant_availability(uuid[]) to anon, authenticated;

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
    'USD',
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
      'USD'::text,
      current_subtotal,
      0::numeric,
      0::numeric,
      current_subtotal,
      current_reservation_expires_at;
end;
$$;

revoke all on function public.create_order(uuid, uuid, jsonb) from public, anon;
grant execute on function public.create_order(uuid, uuid, jsonb) to authenticated;
