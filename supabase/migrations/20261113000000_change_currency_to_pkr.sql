-- Migration: Change default currency from USD to PKR
-- Date: 2026-11-13

-- ============================================================
-- 1. orders table
-- ============================================================

-- Drop old USD-only constraint
alter table public.orders
  drop constraint if exists orders_currency_valid;

-- Change default from USD to PKR
alter table public.orders
  alter column currency set default 'PKR';

-- Update any existing USD records to PKR
update public.orders
  set currency = 'PKR'
  where currency = 'USD';

-- Add new PKR-only constraint
alter table public.orders
  add constraint orders_currency_valid check (currency = 'PKR');

-- ============================================================
-- 2. payments table
-- ============================================================

alter table public.payments
  alter column currency set default 'PKR';

update public.payments
  set currency = 'PKR'
  where currency = 'USD';

-- ============================================================
-- 3. payment_transactions table
-- ============================================================

alter table public.payment_transactions
  alter column currency set default 'PKR';

update public.payment_transactions
  set currency = 'PKR'
  where currency = 'USD';
