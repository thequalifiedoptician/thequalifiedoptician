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
