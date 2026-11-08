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
