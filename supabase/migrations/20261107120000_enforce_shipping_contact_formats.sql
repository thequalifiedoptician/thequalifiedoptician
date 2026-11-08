alter table public.shipping_addresses
  add constraint shipping_addresses_email_format_valid
  check (
    btrim(email) ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ) not valid;

alter table public.shipping_addresses
  add constraint shipping_addresses_phone_format_valid
  check (
    btrim(phone) ~ '^[+]?[0-9() .-]+$'
    and char_length(regexp_replace(btrim(phone), '[^0-9]', '', 'g')) between 7 and 15
  ) not valid;
