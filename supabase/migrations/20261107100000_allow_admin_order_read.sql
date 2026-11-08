drop policy if exists "Catalog admins can read all orders" on public.orders;
create policy "Catalog admins can read all orders"
  on public.orders
  for select
  to authenticated
  using ((select public.is_catalog_admin()));

drop policy if exists "Catalog admins can read all order items" on public.order_items;
create policy "Catalog admins can read all order items"
  on public.order_items
  for select
  to authenticated
  using ((select public.is_catalog_admin()));
