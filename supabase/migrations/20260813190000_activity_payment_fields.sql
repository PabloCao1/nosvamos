alter table public.activities
  add column if not exists total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  add column if not exists currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  add column if not exists original_total_amount numeric(14,2) check (original_total_amount is null or original_total_amount >= 0),
  add column if not exists original_currency text check (original_currency is null or original_currency ~ '^[A-Z]{3}$'),
  add column if not exists exchange_rate numeric(18,8) check (exchange_rate is null or exchange_rate > 0),
  add column if not exists payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  add column if not exists paid_by uuid references public.travelers(id) on delete set null,
  add column if not exists pay_on_arrival boolean not null default false;
