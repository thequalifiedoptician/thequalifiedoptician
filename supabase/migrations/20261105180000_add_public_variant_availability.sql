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
    coalesce(sum(inventory.available_quantity), 0) > 0
  from public.product_variants as variants
  join public.products as products
    on products.id = variants.product_id
  left join public.product_inventory as inventory
    on inventory.variant_id = variants.id
    and inventory.product_id = variants.product_id
  where variants.id = any(p_variant_ids)
    and variants.is_active
    and products.status = 'active'
  group by variants.id;
$$;

revoke all on function public.get_public_variant_availability(uuid[]) from public;
grant execute on function public.get_public_variant_availability(uuid[]) to anon, authenticated;
