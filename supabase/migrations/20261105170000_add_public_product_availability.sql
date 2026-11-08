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
    coalesce(sum(inventory.available_quantity), 0) > 0
  from public.products as products
  left join public.product_inventory as inventory
    on inventory.product_id = products.id
  where products.status = 'active'
    and products.id = any(p_product_ids)
  group by products.id;
$$;

revoke all on function public.get_public_product_availability(uuid[]) from public;
grant execute on function public.get_public_product_availability(uuid[]) to anon, authenticated;
