create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  timing text not null check (timing in ('twoDays','dayBefore','shortlyBefore')),
  sent_at timestamptz not null default now(),
  unique (subscription_id, reservation_id, timing)
);

alter table public.push_deliveries enable row level security;
