alter table public.push_subscriptions
  add column if not exists device_id text,
  add column if not exists timezone text,
  add column if not exists preferences jsonb not null default '{}'::jsonb;

create index if not exists push_subscriptions_device_idx
  on public.push_subscriptions (user_id, device_id);
