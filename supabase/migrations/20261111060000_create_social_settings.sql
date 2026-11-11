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
