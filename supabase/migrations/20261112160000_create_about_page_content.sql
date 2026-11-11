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
