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
