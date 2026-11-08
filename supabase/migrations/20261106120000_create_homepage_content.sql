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
