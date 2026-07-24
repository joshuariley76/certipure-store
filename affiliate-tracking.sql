-- Affiliate tracking + discount codes for CertiPure
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: every statement uses IF NOT EXISTS.

-- 1) Affiliates: one row per affiliate/influencer.
--    `code` is BOTH the customer's discount code and the tracking tag.
create table if not exists public.affiliates (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,            -- stored UPPERCASE, e.g. JAKE10
  name               text not null,
  email              text,
  discount_percent   numeric not null default 10,     -- % off the customer's subtotal
  commission_percent numeric not null default 10,     -- % of subtotal owed to the affiliate
  is_active          boolean not null default true,
  notes              text,
  created_at         timestamptz not null default now()
);

-- Service-role (admin) access only; all lookups happen in server routes.
alter table public.affiliates enable row level security;

-- 2) Orders: which affiliate to credit, and the commission on THIS order.
alter table public.orders add column if not exists affiliate_id      uuid references public.affiliates(id);
alter table public.orders add column if not exists affiliate_code    text;
alter table public.orders add column if not exists commission_amount numeric default 0;

-- 3) Profiles: lifetime ownership — the first affiliate this customer came through.
alter table public.profiles add column if not exists referred_by_code text;
alter table public.profiles add column if not exists referred_by_id   uuid references public.affiliates(id);

-- 4) Reporting index.
create index if not exists orders_affiliate_id_idx on public.orders(affiliate_id);

-- 5) (Optional) seed one test affiliate so you can try it end-to-end.
--    Delete this line if you don't want a test code.
insert into public.affiliates (code, name, email, discount_percent, commission_percent)
values ('JAKE10', 'Jake (test affiliate)', null, 10, 10)
on conflict (code) do nothing;
