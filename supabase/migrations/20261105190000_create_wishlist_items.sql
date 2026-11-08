create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint wishlist_items_user_product_unique unique (user_id, product_id)
);

create index if not exists wishlist_items_user_created_idx
  on public.wishlist_items (user_id, created_at desc);

alter table public.wishlist_items enable row level security;

revoke all on table public.wishlist_items from anon, authenticated;
grant select, insert, delete on table public.wishlist_items to authenticated;

drop policy if exists "Users can read their own wishlist items" on public.wishlist_items;
create policy "Users can read their own wishlist items"
  on public.wishlist_items
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add active products to their wishlist" on public.wishlist_items;
create policy "Users can add active products to their wishlist"
  on public.wishlist_items
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.products
      where products.id = wishlist_items.product_id
        and products.status = 'active'
    )
  );

drop policy if exists "Users can remove their own wishlist items" on public.wishlist_items;
create policy "Users can remove their own wishlist items"
  on public.wishlist_items
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
