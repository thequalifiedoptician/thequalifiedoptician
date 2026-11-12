-- =========================================================
-- Migration: 20261105140000_create_profiles_on_auth_signup.sql
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  auth_provider text not null default 'email',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;

create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    avatar_url,
    auth_provider
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'user_name', '')
    ),
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    ),
    coalesce(nullif(new.raw_app_meta_data ->> 'provider', ''), 'email')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

insert into public.profiles (
  id,
  full_name,
  email,
  avatar_url,
  auth_provider
)
select
  users.id,
  coalesce(
    nullif(users.raw_user_meta_data ->> 'full_name', ''),
    nullif(users.raw_user_meta_data ->> 'name', ''),
    nullif(users.raw_user_meta_data ->> 'user_name', '')
  ),
  users.email,
  coalesce(
    nullif(users.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(users.raw_user_meta_data ->> 'picture', '')
  ),
  coalesce(nullif(users.raw_app_meta_data ->> 'provider', ''), 'email')
from auth.users as users
on conflict (id) do nothing;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();


-- =========================================================
-- Migration: 20261105150000_create_product_catalog.sql
-- =========================================================

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_sort_order_nonnegative check (sort_order >= 0)
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  brand_id uuid references public.brands (id) on delete set null,
  name text not null,
  slug text not null,
  short_description text,
  description text,
  sku text not null,
  price numeric(12, 2) not null,
  compare_price numeric(12, 2),
  featured boolean not null default false,
  status text not null default 'draft',
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_price_nonnegative check (price >= 0),
  constraint products_compare_price_valid check (
    compare_price is null or compare_price >= price
  ),
  constraint products_status_valid check (
    status in ('draft', 'active', 'archived')
  )
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  image_url text not null,
  alt_text text not null default '',
  display_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint product_images_display_order_nonnegative check (display_order >= 0)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null,
  color text,
  size text,
  material text,
  price numeric(12, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_price_nonnegative check (price is null or price >= 0),
  constraint product_variants_id_product_id_unique unique (id, product_id)
);

create table if not exists public.product_inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid,
  quantity_on_hand integer not null default 0,
  quantity_reserved integer not null default 0,
  available_quantity integer generated always as (
    quantity_on_hand - quantity_reserved
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_inventory_quantities_nonnegative check (
    quantity_on_hand >= 0 and quantity_reserved >= 0
  ),
  constraint product_inventory_reserved_within_stock check (
    quantity_reserved <= quantity_on_hand
  ),
  constraint product_inventory_variant_belongs_to_product
    foreign key (variant_id, product_id)
    references public.product_variants (id, product_id)
    on delete cascade
);

create unique index if not exists categories_slug_lower_unique
  on public.categories (lower(slug));
create index if not exists categories_parent_id_idx
  on public.categories (parent_id);
create index if not exists categories_active_sort_order_idx
  on public.categories (sort_order, name)
  where is_active;

create unique index if not exists brands_slug_lower_unique
  on public.brands (lower(slug));
create index if not exists brands_active_name_idx
  on public.brands (name)
  where is_active;

create unique index if not exists products_slug_lower_unique
  on public.products (lower(slug));
create unique index if not exists products_sku_lower_unique
  on public.products (lower(sku));
create index if not exists products_active_category_created_idx
  on public.products (category_id, created_at desc)
  where status = 'active';
create index if not exists products_active_brand_created_idx
  on public.products (brand_id, created_at desc)
  where status = 'active';
create index if not exists products_active_featured_created_idx
  on public.products (created_at desc)
  where status = 'active' and featured;

create index if not exists product_images_product_order_idx
  on public.product_images (product_id, display_order, id);
create unique index if not exists product_images_one_primary_per_product
  on public.product_images (product_id)
  where is_primary;

create unique index if not exists product_variants_sku_lower_unique
  on public.product_variants (lower(sku));
create unique index if not exists product_variants_options_unique
  on public.product_variants (
    product_id,
    (coalesce(color, '')),
    (coalesce(size, '')),
    (coalesce(material, ''))
  );
create index if not exists product_variants_active_product_idx
  on public.product_variants (product_id)
  where is_active;

create unique index if not exists product_inventory_base_product_unique
  on public.product_inventory (product_id)
  where variant_id is null;
create unique index if not exists product_inventory_variant_unique
  on public.product_inventory (variant_id)
  where variant_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists brands_set_updated_at on public.brands;
create trigger brands_set_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

drop trigger if exists product_inventory_set_updated_at on public.product_inventory;
create trigger product_inventory_set_updated_at
  before update on public.product_inventory
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_inventory enable row level security;

revoke all on table
  public.categories,
  public.brands,
  public.products,
  public.product_images,
  public.product_variants,
  public.product_inventory
from anon, authenticated;

grant select on table
  public.categories,
  public.brands,
  public.products,
  public.product_images,
  public.product_variants
to anon, authenticated;

grant select on table public.product_inventory to authenticated;

grant insert, update, delete on table
  public.categories,
  public.brands,
  public.products,
  public.product_images,
  public.product_variants,
  public.product_inventory
to authenticated;

create or replace function public.is_catalog_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select auth.jwt()) -> 'app_metadata' ->> 'role',
    ''
  ) = 'admin';
$$;

revoke all on function public.is_catalog_admin() from public, anon;
grant execute on function public.is_catalog_admin() to authenticated;

drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories"
  on public.categories
  for select
  to anon, authenticated
  using (is_active);

drop policy if exists "Catalog admins can manage categories" on public.categories;
create policy "Catalog admins can manage categories"
  on public.categories
  for all
  to authenticated
  using ((select public.is_catalog_admin()))
  with check ((select public.is_catalog_admin()));

drop policy if exists "Public can read active brands" on public.brands;
create policy "Public can read active brands"
  on public.brands
  for select
  to anon, authenticated
  using (is_active);

drop policy if exists "Catalog admins can manage brands" on public.brands;
create policy "Catalog admins can manage brands"
  on public.brands
  for all
  to authenticated
  using ((select public.is_catalog_admin()))
  with check ((select public.is_catalog_admin()));

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
  on public.products
  for select
  to anon, authenticated
  using (status = 'active');

drop policy if exists "Catalog admins can manage products" on public.products;
create policy "Catalog admins can manage products"
  on public.products
  for all
  to authenticated
  using ((select public.is_catalog_admin()))
  with check ((select public.is_catalog_admin()));

drop policy if exists "Public can read images of active products" on public.product_images;
create policy "Public can read images of active products"
  on public.product_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.products
      where products.id = product_images.product_id
        and products.status = 'active'
    )
  );

drop policy if exists "Catalog admins can manage product images" on public.product_images;
create policy "Catalog admins can manage product images"
  on public.product_images
  for all
  to authenticated
  using ((select public.is_catalog_admin()))
  with check ((select public.is_catalog_admin()));

drop policy if exists "Public can read active variants of active products" on public.product_variants;
create policy "Public can read active variants of active products"
  on public.product_variants
  for select
  to anon, authenticated
  using (
    is_active
    and exists (
      select 1
      from public.products
      where products.id = product_variants.product_id
        and products.status = 'active'
    )
  );

drop policy if exists "Catalog admins can manage product variants" on public.product_variants;
create policy "Catalog admins can manage product variants"
  on public.product_variants
  for all
  to authenticated
  using ((select public.is_catalog_admin()))
  with check ((select public.is_catalog_admin()));

drop policy if exists "Catalog admins can manage product inventory" on public.product_inventory;
create policy "Catalog admins can manage product inventory"
  on public.product_inventory
  for all
  to authenticated
  using ((select public.is_catalog_admin()))
  with check ((select public.is_catalog_admin()));


-- =========================================================
-- Migration: 20261105160000_configure_product_image_storage.sql
-- =========================================================

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


-- =========================================================
-- Migration: 20261105170000_add_public_product_availability.sql
-- =========================================================

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


-- =========================================================
-- Migration: 20261105180000_add_public_variant_availability.sql
-- =========================================================

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


-- =========================================================
-- Migration: 20261105190000_create_wishlist_items.sql
-- =========================================================

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


-- =========================================================
-- Migration: 20261105200000_create_cart_items.sql
-- =========================================================

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


-- =========================================================
-- Migration: 20261106120000_create_homepage_content.sql
-- =========================================================

create table if not exists public.homepage_content (
  id integer primary key default 1 check (id = 1),
  draft_content jsonb not null,
  published_content jsonb,
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.homepage_content enable row level security;

drop policy if exists "Homepage admins can manage content" on public.homepage_content;
create policy "Homepage admins can manage content"
  on public.homepage_content
  for all
  to authenticated
  using ((select public.is_catalog_admin()))
  with check ((select public.is_catalog_admin()));

revoke all on table public.homepage_content from anon, authenticated;
grant select, insert, update on table public.homepage_content to authenticated;

create or replace view public.published_homepage_content as
  select published_content as content
  from public.homepage_content
  where id = 1 and published_content is not null;

grant select on public.published_homepage_content to anon, authenticated;

create or replace function public.save_homepage_content(
  p_content jsonb,
  p_publish boolean default false
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select public.is_catalog_admin()) then
    raise exception 'Homepage administrator access is required.';
  end if;

  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'Homepage content must be a JSON object.';
  end if;

  insert into public.homepage_content (
    id,
    draft_content,
    published_content,
    updated_at,
    published_at
  )
  values (
    1,
    p_content,
    case when p_publish then p_content else null end,
    now(),
    case when p_publish then now() else null end
  )
  on conflict (id) do update
  set
    draft_content = excluded.draft_content,
    published_content = case
      when p_publish then excluded.published_content
      else public.homepage_content.published_content
    end,
    updated_at = now(),
    published_at = case
      when p_publish then now()
      else public.homepage_content.published_at
    end;
end;
$$;

revoke all on function public.save_homepage_content(jsonb, boolean) from public, anon;
grant execute on function public.save_homepage_content(jsonb, boolean) to authenticated;


-- =========================================================
-- Migration: 20261106130000_create_shipping_addresses.sql
-- =========================================================

create table if not exists public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text not null,
  country text not null,
  region text not null,
  city text not null,
  postal_code text not null,
  street_address text not null,
  apartment text,
  delivery_notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipping_addresses_full_name_valid check (
    char_length(btrim(full_name)) between 2 and 120
  ),
  constraint shipping_addresses_phone_valid check (
    char_length(btrim(phone)) between 7 and 30
  ),
  constraint shipping_addresses_email_valid check (
    char_length(btrim(email)) between 3 and 254
  ),
  constraint shipping_addresses_country_valid check (
    char_length(btrim(country)) between 2 and 80
  ),
  constraint shipping_addresses_region_valid check (
    char_length(btrim(region)) between 1 and 100
  ),
  constraint shipping_addresses_city_valid check (
    char_length(btrim(city)) between 1 and 100
  ),
  constraint shipping_addresses_postal_code_valid check (
    char_length(btrim(postal_code)) between 3 and 16
  ),
  constraint shipping_addresses_street_address_valid check (
    char_length(btrim(street_address)) between 3 and 200
  ),
  constraint shipping_addresses_apartment_valid check (
    apartment is null or char_length(apartment) <= 120
  ),
  constraint shipping_addresses_delivery_notes_valid check (
    delivery_notes is null or char_length(delivery_notes) <= 500
  )
);

create index if not exists shipping_addresses_user_updated_idx
  on public.shipping_addresses (user_id, updated_at desc);

create unique index if not exists shipping_addresses_one_default_per_user
  on public.shipping_addresses (user_id)
  where is_default;

drop trigger if exists shipping_addresses_set_updated_at on public.shipping_addresses;
create trigger shipping_addresses_set_updated_at
  before update on public.shipping_addresses
  for each row execute function public.set_updated_at();

alter table public.shipping_addresses enable row level security;

revoke all on table public.shipping_addresses from anon, authenticated;
grant select, insert, update, delete on table public.shipping_addresses to authenticated;

drop policy if exists "Users can read their own shipping addresses" on public.shipping_addresses;
create policy "Users can read their own shipping addresses"
  on public.shipping_addresses
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own shipping addresses" on public.shipping_addresses;
create policy "Users can add their own shipping addresses"
  on public.shipping_addresses
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own shipping addresses" on public.shipping_addresses;
create policy "Users can update their own shipping addresses"
  on public.shipping_addresses
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own shipping addresses" on public.shipping_addresses;
create policy "Users can delete their own shipping addresses"
  on public.shipping_addresses
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_default_shipping_address(p_address_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Sign in to manage shipping addresses.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  if not exists (
    select 1
    from public.shipping_addresses
    where id = p_address_id
      and user_id = current_user_id
  ) then
    raise exception 'That shipping address is no longer available.';
  end if;

  update public.shipping_addresses
  set is_default = false
  where user_id = current_user_id
    and is_default
    and id <> p_address_id;

  update public.shipping_addresses
  set is_default = true
  where id = p_address_id
    and user_id = current_user_id
    and not is_default;
end;
$$;

create or replace function public.save_shipping_address(
  p_address_id uuid,
  p_full_name text,
  p_phone text,
  p_email text,
  p_country text,
  p_region text,
  p_city text,
  p_postal_code text,
  p_street_address text,
  p_apartment text,
  p_delivery_notes text,
  p_is_default boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  saved_address_id uuid;
  should_be_default boolean;
begin
  if current_user_id is null then
    raise exception 'Sign in to save a shipping address.';
  end if;

  if p_address_id is not null and not exists (
    select 1
    from public.shipping_addresses
    where id = p_address_id
      and user_id = current_user_id
  ) then
    raise exception 'That shipping address is no longer available.';
  end if;

  if coalesce(p_is_default, false) or not exists (
    select 1
    from public.shipping_addresses
    where user_id = current_user_id
      and is_default
      and id is distinct from p_address_id
  ) then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(current_user_id::text, 0)
    );
    should_be_default := true;
  else
    should_be_default := false;
  end if;

  if p_address_id is null then
    insert into public.shipping_addresses (
      user_id,
      full_name,
      phone,
      email,
      country,
      region,
      city,
      postal_code,
      street_address,
      apartment,
      delivery_notes,
      is_default
    )
    values (
      current_user_id,
      btrim(p_full_name),
      btrim(p_phone),
      btrim(p_email),
      btrim(p_country),
      btrim(p_region),
      btrim(p_city),
      btrim(p_postal_code),
      btrim(p_street_address),
      nullif(btrim(coalesce(p_apartment, '')), ''),
      nullif(btrim(coalesce(p_delivery_notes, '')), ''),
      false
    )
    returning id into saved_address_id;
  else
    update public.shipping_addresses
    set
      full_name = btrim(p_full_name),
      phone = btrim(p_phone),
      email = btrim(p_email),
      country = btrim(p_country),
      region = btrim(p_region),
      city = btrim(p_city),
      postal_code = btrim(p_postal_code),
      street_address = btrim(p_street_address),
      apartment = nullif(btrim(coalesce(p_apartment, '')), ''),
      delivery_notes = nullif(btrim(coalesce(p_delivery_notes, '')), '')
    where id = p_address_id
      and user_id = current_user_id
    returning id into saved_address_id;
  end if;

  if should_be_default then
    update public.shipping_addresses
    set is_default = false
    where user_id = current_user_id
      and is_default
      and id <> saved_address_id;

    update public.shipping_addresses
    set is_default = true
    where id = saved_address_id
      and user_id = current_user_id
      and not is_default;
  end if;

  return saved_address_id;
end;
$$;

create or replace function public.delete_shipping_address(p_address_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  address_is_default boolean;
  replacement_address_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in to remove a shipping address.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  select is_default
  into address_is_default
  from public.shipping_addresses
  where id = p_address_id
    and user_id = current_user_id;

  if not found then
    raise exception 'That shipping address is no longer available.';
  end if;

  if address_is_default then
    select id
    into replacement_address_id
    from public.shipping_addresses
    where user_id = current_user_id
      and id <> p_address_id
    order by updated_at desc, created_at desc
    limit 1;

    if replacement_address_id is not null then
      update public.shipping_addresses
      set is_default = false
      where user_id = current_user_id
        and is_default;

      update public.shipping_addresses
      set is_default = true
      where id = replacement_address_id
        and user_id = current_user_id;
    end if;
  end if;

  delete from public.shipping_addresses
  where id = p_address_id
    and user_id = current_user_id;
end;
$$;

revoke all on function public.set_default_shipping_address(uuid) from public, anon;
grant execute on function public.set_default_shipping_address(uuid) to authenticated;
revoke all on function public.save_shipping_address(
  uuid, text, text, text, text, text, text, text, text, text, text, boolean
) from public, anon;
grant execute on function public.save_shipping_address(
  uuid, text, text, text, text, text, text, text, text, text, text, boolean
) to authenticated;
revoke all on function public.delete_shipping_address(uuid) from public, anon;
grant execute on function public.delete_shipping_address(uuid) to authenticated;


-- =========================================================
-- Migration: 20261106140000_create_orders.sql
-- =========================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  order_number text not null unique,
  idempotency_key uuid not null,
  status text not null default 'pending_payment',
  currency text not null default 'PKR',
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
  constraint orders_currency_valid check (currency = 'PKR'),
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


-- =========================================================
-- Migration: 20261106150000_create_payment_architecture.sql
-- =========================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provider_id text not null,
  method_id text not null,
  status text not null default 'pending',
  amount numeric(12, 2) not null,
  currency text not null default 'PKR',
  provider_reference text,
  provider_token_reference text,
  idempotency_key uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_provider_id_valid check (
    provider_id ~ '^[a-z][a-z0-9_-]{1,63}$'
  ),
  constraint payments_method_id_valid check (
    method_id ~ '^[a-z][a-z0-9_-]{1,63}$'
  ),
  constraint payments_status_valid check (
    status in ('pending', 'processing', 'authorized', 'paid', 'failed', 'cancelled', 'refunded')
  ),
  constraint payments_amount_nonnegative check (amount >= 0),
  constraint payments_currency_valid check (currency ~ '^[A-Z]{3}$'),
  constraint payments_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint payments_order_idempotency_unique unique (order_id, idempotency_key)
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  provider_id text not null,
  status text not null,
  amount numeric(12, 2) not null,
  currency text not null,
  provider_event_id text,
  transaction_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint payment_transactions_provider_id_valid check (
    provider_id ~ '^[a-z][a-z0-9_-]{1,63}$'
  ),
  constraint payment_transactions_status_valid check (
    status in ('pending', 'processing', 'authorized', 'paid', 'failed', 'cancelled', 'refunded')
  ),
  constraint payment_transactions_amount_nonnegative check (amount >= 0),
  constraint payment_transactions_currency_valid check (currency ~ '^[A-Z]{3}$'),
  constraint payment_transactions_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists payments_order_created_idx
  on public.payments (order_id, created_at desc);
create index if not exists payments_status_created_idx
  on public.payments (status, created_at);
create unique index if not exists payments_provider_reference_unique
  on public.payments (provider_id, provider_reference)
  where provider_reference is not null;
create index if not exists payment_transactions_payment_created_idx
  on public.payment_transactions (payment_id, created_at);
create unique index if not exists payment_transactions_reference_unique
  on public.payment_transactions (provider_id, transaction_reference)
  where transaction_reference is not null;
create unique index if not exists payment_transactions_event_unique
  on public.payment_transactions (provider_id, provider_event_id)
  where provider_event_id is not null;

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.payments enable row level security;
alter table public.payment_transactions enable row level security;

revoke all on table public.payments, public.payment_transactions from anon, authenticated;
grant select (
  id,
  order_id,
  provider_id,
  method_id,
  status,
  amount,
  currency,
  provider_reference,
  idempotency_key,
  metadata,
  created_at,
  updated_at
) on public.payments to authenticated;
grant select on table public.payment_transactions to authenticated;

drop policy if exists "Users can read payments for their own orders" on public.payments;
create policy "Users can read payments for their own orders"
  on public.payments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders
      where orders.id = payments.order_id
        and orders.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can read transactions for their own payments"
  on public.payment_transactions;
create policy "Users can read transactions for their own payments"
  on public.payment_transactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.payments
      join public.orders on orders.id = payments.order_id
      where payments.id = payment_transactions.payment_id
        and orders.user_id = (select auth.uid())
    )
  );

revoke all on table public.payments, public.payment_transactions from service_role;
grant select, insert, update on table public.payments to service_role;
grant select, insert on table public.payment_transactions to service_role;


-- =========================================================
-- Migration: 20261107100000_allow_admin_order_read.sql
-- =========================================================

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


-- =========================================================
-- Migration: 20261107110000_add_admin_order_summary.sql
-- =========================================================

create or replace function public.get_admin_order_summary(
  p_start_at timestamptz default null,
  p_end_at timestamptz default null
)
returns table (
  order_count bigint,
  pending_count bigint,
  inactive_count bigint,
  pending_order_value numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*)::bigint,
    count(*) filter (where orders.status = 'pending_payment')::bigint,
    count(*) filter (where orders.status in ('cancelled', 'expired'))::bigint,
    coalesce(
      sum(orders.total) filter (where orders.status = 'pending_payment'),
      0
    )::numeric
  from public.orders
  where (select public.is_catalog_admin())
    and (p_start_at is null or orders.created_at >= p_start_at)
    and (p_end_at is null or orders.created_at < p_end_at);
$$;

revoke all on function public.get_admin_order_summary(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.get_admin_order_summary(timestamptz, timestamptz)
  to authenticated;


-- =========================================================
-- Migration: 20261107120000_enforce_shipping_contact_formats.sql
-- =========================================================

alter table public.shipping_addresses
  add constraint shipping_addresses_email_format_valid
  check (
    btrim(email) ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ) not valid;

alter table public.shipping_addresses
  add constraint shipping_addresses_phone_format_valid
  check (
    btrim(phone) ~ '^[+]?[0-9() .-]+$'
    and char_length(regexp_replace(btrim(phone), '[^0-9]', '', 'g')) between 7 and 15
  ) not valid;


-- =========================================================
-- Migration: 20261107130000_add_safepay_checkout_url.sql
-- =========================================================

alter table public.payments
  add column if not exists checkout_url text;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'payments_safepay_checkout_url_valid'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_safepay_checkout_url_valid
      check (
        checkout_url is null
        or checkout_url ~ '^https://(sandbox[.]api[.]getsafepay[.]com|getsafepay[.]com)/checkout/pay[?]'
      );
  end if;
end;
$$;


-- =========================================================
-- Migration: 20261108140000_add_safepay_webhook_processing.sql
-- =========================================================

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


-- =========================================================
-- Migration: 20261109110000_add_safepay_inline_webhook_processing.sql
-- =========================================================

create or replace function public.process_safepay_webhook_event_inline(p_event_row_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_row public.payment_events%rowtype;
  result_value jsonb;
  error_state text;
begin
  select events.*
  into event_row
  from public.payment_events as events
  where events.id = p_event_row_id
  for update;

  if not found or not event_row.signature_verified then
    raise exception using message = 'SAFEPAY_EVENT_NOT_FOUND_OR_UNVERIFIED';
  end if;

  if event_row.processing_status in ('processed', 'ignored') then
    return event_row.processing_result || jsonb_build_object('duplicate', true);
  end if;

  if event_row.processing_status = 'failed' and event_row.next_attempt_at is null then
    return event_row.processing_result || jsonb_build_object('terminal', true);
  end if;

  if event_row.processing_status = 'processing'
    and event_row.lease_expires_at > now() then
    return jsonb_build_object('result', 'processing_in_progress');
  end if;

  if event_row.processing_attempts >= 8 then
    update public.payment_events
    set processing_status = 'failed',
        next_attempt_at = null,
        lease_expires_at = null,
        last_error = 'WEBHOOK_PROCESSING_RETRY_EXHAUSTED',
        processing_result = jsonb_build_object('result', 'processing_retry_exhausted')
    where id = event_row.id;
    return jsonb_build_object('result', 'processing_retry_exhausted');
  end if;

  update public.payment_events
  set processing_status = 'processing',
      processing_attempts = processing_attempts + 1,
      lease_expires_at = now() + interval '1 minute',
      next_attempt_at = null,
      last_error = null
  where id = event_row.id;

  begin
    result_value := public.process_safepay_webhook_event(event_row.id);
    return result_value;
  exception when others then
    get stacked diagnostics error_state = returned_sqlstate;

    update public.payment_events
    set processing_status = case
          when event_row.processing_attempts + 1 >= 8 then 'failed'
          else 'received'
        end,
        next_attempt_at = case
          when event_row.processing_attempts + 1 >= 8 then null
          else now()
        end,
        lease_expires_at = null,
        last_error = 'SQLSTATE:' || left(error_state, 5),
        processing_result = jsonb_build_object(
          'result',
          case
            when event_row.processing_attempts + 1 >= 8
              then 'processing_retry_exhausted'
            else 'processing_retry_scheduled'
          end
        )
    where id = event_row.id;

    return jsonb_build_object(
      'result',
      case
        when event_row.processing_attempts + 1 >= 8
          then 'processing_retry_exhausted'
        else 'processing_retry_scheduled'
      end
    );
  end;
end;
$$;

revoke all on function public.process_safepay_webhook_event_inline(uuid)
  from public, anon, authenticated;
grant execute on function public.process_safepay_webhook_event_inline(uuid)
  to service_role;


-- =========================================================
-- Migration: 20261111040000_fix_published_homepage_view_permissions.sql
-- =========================================================

alter view public.published_homepage_content set (security_invoker = false);

grant select on public.published_homepage_content to anon, authenticated;


-- =========================================================
-- Migration: 20261111050000_create_brand_settings.sql
-- =========================================================

create table if not exists public.brand_settings (
  id uuid primary key default gen_random_uuid(),
  is_active boolean not null default true,
  brand_name text not null default '',
  brand_tagline text not null default '',
  browser_title text not null default '',
  logo_url text,
  favicon_url text,
  company_name text not null default '',
  company_email text not null default '',
  company_phone text not null default '',
  company_address text not null default '',
  company_city text not null default '',
  company_country text not null default '',
  postal_code text not null default '',
  google_maps_url text not null default '',
  support_email text not null default '',
  footer_copyright text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists brand_settings_single_active
  on public.brand_settings (is_active)
  where is_active;

drop trigger if exists brand_settings_set_updated_at on public.brand_settings;
create trigger brand_settings_set_updated_at
  before update on public.brand_settings
  for each row execute function public.set_updated_at();

alter table public.brand_settings enable row level security;

revoke all on table public.brand_settings from public, anon, authenticated;
grant select on table public.brand_settings to anon, authenticated;
grant insert, update, delete on table public.brand_settings to authenticated;

drop policy if exists "Anyone can read active brand settings" on public.brand_settings;
create policy "Anyone can read active brand settings"
  on public.brand_settings
  for select
  to anon, authenticated
  using (is_active);

drop policy if exists "Brand admins can manage settings" on public.brand_settings;
create policy "Brand admins can manage settings"
  on public.brand_settings
  for all
  to authenticated
  using ((select public.is_catalog_admin()))
  with check ((select public.is_catalog_admin()));

insert into public.brand_settings (
  id,
  is_active,
  brand_name,
  brand_tagline,
  browser_title,
  company_name,
  footer_copyright
)
values (
  '00000000-0000-4000-8000-000000000001',
  true,
  'AlSera',
  'Objects for living',
  'AlSera',
  'AlSera',
  '© {year} AlSera. A considered point of view.'
)
on conflict (id) do nothing;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'brand-assets',
  'brand-assets',
  true,
  5242880,
  array[
    'image/png',
    'image/svg+xml',
    'image/webp',
    'image/jpeg',
    'image/x-icon',
    'image/vnd.microsoft.icon'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read brand assets" on storage.objects;
create policy "Public can read brand assets"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'brand-assets');

drop policy if exists "Brand admins can upload brand assets" on storage.objects;
create policy "Brand admins can upload brand assets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] in ('logo', 'favicon')
    and (select public.is_catalog_admin())
  );

drop policy if exists "Brand admins can update brand assets" on storage.objects;
create policy "Brand admins can update brand assets"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] in ('logo', 'favicon')
    and (select public.is_catalog_admin())
  )
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] in ('logo', 'favicon')
    and (select public.is_catalog_admin())
  );

drop policy if exists "Brand admins can delete brand assets" on storage.objects;
create policy "Brand admins can delete brand assets"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] in ('logo', 'favicon')
    and (select public.is_catalog_admin())
  );


-- =========================================================
-- Migration: 20261111060000_create_social_settings.sql
-- =========================================================

create table if not exists public.social_settings (
  id smallint primary key default 1 check (id = 1),
  whatsapp_number text not null default '',
  whatsapp_message text not null default '',
  facebook_url text not null default '',
  instagram_url text not null default '',
  tiktok_url text not null default '',
  linkedin_url text not null default '',
  youtube_url text not null default '',
  twitter_url text not null default '',
  pinterest_url text not null default '',
  email text not null default '',
  support_phone text not null default '',
  enable_whatsapp boolean not null default false,
  enable_facebook boolean not null default false,
  enable_instagram boolean not null default false,
  enable_tiktok boolean not null default false,
  enable_linkedin boolean not null default false,
  enable_youtube boolean not null default false,
  enable_twitter boolean not null default false,
  enable_pinterest boolean not null default false,
  enable_email boolean not null default false,
  updated_at timestamptz not null default now()
);

drop trigger if exists social_settings_set_updated_at on public.social_settings;
create trigger social_settings_set_updated_at
  before update on public.social_settings
  for each row execute function public.set_updated_at();

alter table public.social_settings enable row level security;

revoke all on table public.social_settings from public, anon, authenticated;
grant select on table public.social_settings to anon, authenticated;
grant insert, update, delete on table public.social_settings to authenticated;

drop policy if exists "Anyone can read social settings" on public.social_settings;
create policy "Anyone can read social settings"
  on public.social_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Social admins can manage settings" on public.social_settings;
create policy "Social admins can manage settings"
  on public.social_settings
  for all
  to authenticated
  using ((select public.is_catalog_admin()))
  with check ((select public.is_catalog_admin()));

insert into public.social_settings (id)
values (1)
on conflict (id) do nothing;


-- =========================================================
-- Migration: 20261112140000_create_manual_payment_verification.sql
-- =========================================================

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


-- =========================================================
-- Migration: 20261112150000_create_deals_management.sql
-- =========================================================

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 120),
  badge text not null default '' check (length(badge) <= 60),
  description text not null default '' check (length(description) <= 700),
  image_path text not null check (length(btrim(image_path)) between 1 and 500),
  image_url text not null check (length(btrim(image_url)) between 1 and 2000),
  image_alt text not null check (length(btrim(image_alt)) between 1 and 200),
  action_label text not null default 'Explore the deal'
    check (length(btrim(action_label)) between 1 and 50),
  action_href text not null default '/shop'
    check (length(btrim(action_href)) between 1 and 500),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deals_schedule_valid check (
    starts_at is null or ends_at is null or starts_at < ends_at
  )
);

create index if not exists deals_active_sort_idx
  on public.deals (sort_order, created_at desc)
  where is_active;

alter table public.deals enable row level security;

drop policy if exists "Public can read scheduled active deals" on public.deals;
create policy "Public can read scheduled active deals"
  on public.deals
  for select
  to anon, authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

drop policy if exists "Admins can manage deals" on public.deals;
create policy "Admins can manage deals"
  on public.deals
  for all
  to authenticated
  using ((select public.is_catalog_admin()))
  with check ((select public.is_catalog_admin()));

revoke all on table public.deals from anon, authenticated;
grant select on table public.deals to anon, authenticated;
grant insert, update, delete on table public.deals to authenticated;

drop trigger if exists deals_set_updated_at on public.deals;
create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'deal-banners',
  'deal-banners',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read deal banner images" on storage.objects;
create policy "Public can read deal banner images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'deal-banners');

drop policy if exists "Admins can upload deal banner images" on storage.objects;
create policy "Admins can upload deal banner images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'deal-banners'
    and (storage.foldername(name))[1] = 'deals'
    and (select public.is_catalog_admin())
  );

drop policy if exists "Admins can update deal banner images" on storage.objects;
create policy "Admins can update deal banner images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'deal-banners'
    and (storage.foldername(name))[1] = 'deals'
    and (select public.is_catalog_admin())
  )
  with check (
    bucket_id = 'deal-banners'
    and (storage.foldername(name))[1] = 'deals'
    and (select public.is_catalog_admin())
  );

drop policy if exists "Admins can delete deal banner images" on storage.objects;
create policy "Admins can delete deal banner images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'deal-banners'
    and (storage.foldername(name))[1] = 'deals'
    and (select public.is_catalog_admin())
  );


-- =========================================================
-- Migration: 20261112160000_create_about_page_content.sql
-- =========================================================

create table if not exists public.about_page_content (
  id integer primary key default 1 check (id = 1),
  draft_content jsonb not null,
  published_content jsonb,
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.about_page_content enable row level security;

drop policy if exists "About page admins can manage content" on public.about_page_content;
create policy "About page admins can manage content"
  on public.about_page_content
  for all
  to authenticated
  using ((select public.is_catalog_admin()))
  with check ((select public.is_catalog_admin()));

revoke all on table public.about_page_content from anon, authenticated;
grant select, insert, update on table public.about_page_content to authenticated;

create or replace view public.published_about_page_content as
  select published_content as content
  from public.about_page_content
  where id = 1 and published_content is not null;

alter view public.published_about_page_content set (security_invoker = false);
grant select on public.published_about_page_content to anon, authenticated;

create or replace function public.save_about_page_content(
  p_content jsonb,
  p_publish boolean default false
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select public.is_catalog_admin()) then
    raise exception 'About page administrator access is required.';
  end if;

  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'About page content must be a JSON object.';
  end if;

  insert into public.about_page_content (
    id,
    draft_content,
    published_content,
    updated_at,
    published_at
  )
  values (
    1,
    p_content,
    case when p_publish then p_content else null end,
    now(),
    case when p_publish then now() else null end
  )
  on conflict (id) do update
  set
    draft_content = excluded.draft_content,
    published_content = case
      when p_publish then excluded.published_content
      else public.about_page_content.published_content
    end,
    updated_at = now(),
    published_at = case
      when p_publish then now()
      else public.about_page_content.published_at
    end;
end;
$$;

revoke all on function public.save_about_page_content(jsonb, boolean) from public, anon;
grant execute on function public.save_about_page_content(jsonb, boolean) to authenticated;

insert into public.about_page_content (id, draft_content, published_content, published_at)
values (
  1,
  '{
    "hero": {
      "eyebrow": "A point of view, thoughtfully considered",
      "title": "Good things make a home.",
      "description": "We believe the everyday deserves a little more thought. AlSera brings together well-made pieces that feel right to live with, return to, and make your own.",
      "imagePath": "",
      "imageUrl": "",
      "imageAlt": "A thoughtful collection of everyday pieces"
    },
    "story": {
      "eyebrow": "OUR STORY",
      "title": "A more considered way to choose.",
      "body": "AlSera began with a simple idea: the things around us should earn their place. We look for useful design, lasting quality, and small details that make everyday moments feel better.\n\nOur collection brings together pieces for home, style, technology, and the rituals in between. Each one is chosen with care, so finding something meaningful can feel simple.",
      "imagePath": "",
      "imageUrl": "",
      "imageAlt": "A calm, considered everyday setting"
    },
    "values": [
      {
        "title": "Chosen with care",
        "description": "We look beyond what is new to find what is useful, well made, and worth keeping."
      },
      {
        "title": "Made for real life",
        "description": "Thoughtful details matter most when they make everyday routines a little easier."
      },
      {
        "title": "Room to be yourself",
        "description": "A good collection leaves space for your own taste, rituals, and way of living."
      }
    ],
    "closing": {
      "title": "Make room for what matters.",
      "description": "Find a few good things for the everyday moments that make a place feel like yours."
    }
  }'::jsonb,
  '{
    "hero": {
      "eyebrow": "A point of view, thoughtfully considered",
      "title": "Good things make a home.",
      "description": "We believe the everyday deserves a little more thought. AlSera brings together well-made pieces that feel right to live with, return to, and make your own.",
      "imagePath": "",
      "imageUrl": "",
      "imageAlt": "A thoughtful collection of everyday pieces"
    },
    "story": {
      "eyebrow": "OUR STORY",
      "title": "A more considered way to choose.",
      "body": "AlSera began with a simple idea: the things around us should earn their place. We look for useful design, lasting quality, and small details that make everyday moments feel better.\n\nOur collection brings together pieces for home, style, technology, and the rituals in between. Each one is chosen with care, so finding something meaningful can feel simple.",
      "imagePath": "",
      "imageUrl": "",
      "imageAlt": "A calm, considered everyday setting"
    },
    "values": [
      {
        "title": "Chosen with care",
        "description": "We look beyond what is new to find what is useful, well made, and worth keeping."
      },
      {
        "title": "Made for real life",
        "description": "Thoughtful details matter most when they make everyday routines a little easier."
      },
      {
        "title": "Room to be yourself",
        "description": "A good collection leaves space for your own taste, rituals, and way of living."
      }
    ],
    "closing": {
      "title": "Make room for what matters.",
      "description": "Find a few good things for the everyday moments that make a place feel like yours."
    }
  }'::jsonb,
  now()
)
on conflict (id) do nothing;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'about-assets',
  'about-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read about page images" on storage.objects;
create policy "Public can read about page images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'about-assets');

drop policy if exists "Admins can upload about page images" on storage.objects;
create policy "Admins can upload about page images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'about-assets'
    and (storage.foldername(name))[1] = 'about'
    and (select public.is_catalog_admin())
  );

drop policy if exists "Admins can update about page images" on storage.objects;
create policy "Admins can update about page images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'about-assets'
    and (storage.foldername(name))[1] = 'about'
    and (select public.is_catalog_admin())
  )
  with check (
    bucket_id = 'about-assets'
    and (storage.foldername(name))[1] = 'about'
    and (select public.is_catalog_admin())
  );

drop policy if exists "Admins can delete about page images" on storage.objects;
create policy "Admins can delete about page images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'about-assets'
    and (storage.foldername(name))[1] = 'about'
    and (select public.is_catalog_admin())
  );



