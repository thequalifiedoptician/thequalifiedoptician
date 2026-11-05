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
