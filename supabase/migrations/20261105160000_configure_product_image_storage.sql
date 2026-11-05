alter table public.product_images
  add column if not exists storage_path text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read product image objects" on storage.objects;
create policy "Public can read product image objects"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Catalog admins can upload product image objects" on storage.objects;
create policy "Catalog admins can upload product image objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (select public.is_catalog_admin())
  );

drop policy if exists "Catalog admins can update product image objects" on storage.objects;
create policy "Catalog admins can update product image objects"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select public.is_catalog_admin())
  )
  with check (
    bucket_id = 'product-images'
    and (select public.is_catalog_admin())
  );

drop policy if exists "Catalog admins can delete product image objects" on storage.objects;
create policy "Catalog admins can delete product image objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select public.is_catalog_admin())
  );

create or replace function public.save_catalog_product(
  p_product jsonb,
  p_images jsonb,
  p_variants jsonb,
  p_inventory jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_product_id uuid := (p_product ->> 'id')::uuid;
begin
  if not (select public.is_catalog_admin()) then
    raise exception 'Catalog administrator access is required.';
  end if;

  insert into public.products (
    id,
    category_id,
    brand_id,
    name,
    slug,
    short_description,
    description,
    sku,
    price,
    compare_price,
    status,
    featured,
    thumbnail_url
  )
  values (
    saved_product_id,
    nullif(p_product ->> 'category_id', '')::uuid,
    nullif(p_product ->> 'brand_id', '')::uuid,
    p_product ->> 'name',
    p_product ->> 'slug',
    nullif(p_product ->> 'short_description', ''),
    nullif(p_product ->> 'description', ''),
    p_product ->> 'sku',
    (p_product ->> 'price')::numeric,
    nullif(p_product ->> 'compare_price', '')::numeric,
    p_product ->> 'status',
    (p_product ->> 'featured')::boolean,
    nullif(p_product ->> 'thumbnail_url', '')
  )
  on conflict (id) do update
  set
    category_id = excluded.category_id,
    brand_id = excluded.brand_id,
    name = excluded.name,
    slug = excluded.slug,
    short_description = excluded.short_description,
    description = excluded.description,
    sku = excluded.sku,
    price = excluded.price,
    compare_price = excluded.compare_price,
    status = excluded.status,
    featured = excluded.featured,
    thumbnail_url = excluded.thumbnail_url;

  delete from public.product_images
  where product_id = saved_product_id;

  insert into public.product_images (
    product_id,
    image_url,
    storage_path,
    alt_text,
    display_order,
    is_primary
  )
  select
    saved_product_id,
    image.image_url,
    image.storage_path,
    coalesce(image.alt_text, ''),
    image.display_order,
    image.is_primary
  from pg_catalog.jsonb_to_recordset(coalesce(p_images, '[]'::jsonb)) as image(
    image_url text,
    storage_path text,
    alt_text text,
    display_order integer,
    is_primary boolean
  );

  delete from public.product_inventory
  where product_id = saved_product_id;

  delete from public.product_variants
  where product_id = saved_product_id;

  insert into public.product_variants (
    id,
    product_id,
    sku,
    color,
    size,
    material,
    price,
    is_active
  )
  select
    variant.id,
    saved_product_id,
    variant.sku,
    nullif(variant.color, ''),
    nullif(variant.size, ''),
    nullif(variant.material, ''),
    variant.price,
    true
  from pg_catalog.jsonb_to_recordset(coalesce(p_variants, '[]'::jsonb)) as variant(
    id uuid,
    sku text,
    color text,
    size text,
    material text,
    price numeric
  );

  insert into public.product_inventory (
    product_id,
    variant_id,
    quantity_on_hand,
    quantity_reserved
  )
  select
    saved_product_id,
    inventory.variant_id,
    inventory.quantity_on_hand,
    inventory.quantity_reserved
  from pg_catalog.jsonb_to_recordset(coalesce(p_inventory, '[]'::jsonb)) as inventory(
    variant_id uuid,
    quantity_on_hand integer,
    quantity_reserved integer
  );

  return saved_product_id;
end;
$$;

revoke all on function public.save_catalog_product(jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_catalog_product(jsonb, jsonb, jsonb, jsonb) to authenticated;
