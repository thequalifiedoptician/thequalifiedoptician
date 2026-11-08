create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid,
  quantity integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cart_items_quantity_valid check (quantity between 1 and 99),
  constraint cart_items_variant_belongs_to_product
    foreign key (variant_id, product_id)
    references public.product_variants (id, product_id)
    on delete cascade,
  constraint cart_items_user_product_variant_unique
    unique nulls not distinct (user_id, product_id, variant_id)
);

create index if not exists cart_items_user_created_idx
  on public.cart_items (user_id, created_at desc);

drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

alter table public.cart_items enable row level security;

revoke all on table public.cart_items from anon, authenticated;
grant select, insert, delete on table public.cart_items to authenticated;
grant update (quantity) on table public.cart_items to authenticated;

drop policy if exists "Users can read their own cart items" on public.cart_items;
create policy "Users can read their own cart items"
  on public.cart_items
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add active products to their cart" on public.cart_items;
create policy "Users can add active products to their cart"
  on public.cart_items
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.products
      where products.id = cart_items.product_id
        and products.status = 'active'
    )
    and (
      variant_id is null
      or exists (
        select 1
        from public.product_variants
        where product_variants.id = cart_items.variant_id
          and product_variants.product_id = cart_items.product_id
          and product_variants.is_active
      )
    )
    and (
      variant_id is not null
      or not exists (
        select 1
        from public.product_variants
        where product_variants.product_id = cart_items.product_id
          and product_variants.is_active
      )
    )
    and case
      when variant_id is null then coalesce((
        select availability.in_stock
        from public.get_public_product_availability(array[cart_items.product_id]) as availability
      ), false)
      else coalesce((
        select availability.in_stock
        from public.get_public_variant_availability(array[cart_items.variant_id]) as availability
      ), false)
    end
  );

drop policy if exists "Users can update their own cart items" on public.cart_items;
create policy "Users can update their own cart items"
  on public.cart_items
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and quantity between 1 and 99
  );

drop policy if exists "Users can remove their own cart items" on public.cart_items;
create policy "Users can remove their own cart items"
  on public.cart_items
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.add_cart_item(
  p_product_id uuid,
  p_variant_id uuid,
  p_quantity integer
)
returns setof public.cart_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  is_in_stock boolean;
begin
  if current_user_id is null then
    raise exception 'Sign in to add items to your cart.';
  end if;
  if p_quantity < 1 or p_quantity > 99 then
    raise exception 'Cart quantity must be between 1 and 99.';
  end if;
  if not exists (
    select 1
    from public.products
    where products.id = p_product_id
      and products.status = 'active'
  ) then
    raise exception 'This product is no longer available.';
  end if;
  if p_variant_id is not null and not exists (
    select 1
    from public.product_variants
    where product_variants.id = p_variant_id
      and product_variants.product_id = p_product_id
      and product_variants.is_active
  ) then
    raise exception 'This product option is no longer available.';
  end if;
  if p_variant_id is null and exists (
    select 1
    from public.product_variants
    where product_variants.product_id = p_product_id
      and product_variants.is_active
  ) then
    raise exception 'Choose an option before adding this product.';
  end if;
  if p_variant_id is null then
    select availability.in_stock
    into is_in_stock
    from public.get_public_product_availability(array[p_product_id]) as availability;
  else
    select availability.in_stock
    into is_in_stock
    from public.get_public_variant_availability(array[p_variant_id]) as availability;
  end if;
  if not coalesce(is_in_stock, false) then
    raise exception 'This product is out of stock.';
  end if;

  return query
  insert into public.cart_items (user_id, product_id, variant_id, quantity)
  values (current_user_id, p_product_id, p_variant_id, p_quantity)
  on conflict on constraint cart_items_user_product_variant_unique
  do update set quantity = least(public.cart_items.quantity + excluded.quantity, 99)
  returning *;
end;
$$;

revoke all on function public.add_cart_item(uuid, uuid, integer) from public, anon;
grant execute on function public.add_cart_item(uuid, uuid, integer) to authenticated;
