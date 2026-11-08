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
