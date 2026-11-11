alter view public.published_homepage_content set (security_invoker = false);

grant select on public.published_homepage_content to anon, authenticated;
