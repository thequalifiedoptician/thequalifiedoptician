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
