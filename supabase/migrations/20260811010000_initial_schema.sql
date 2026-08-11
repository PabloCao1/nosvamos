-- NosVamos: esquema inicial para Supabase
-- Ejecutar una sola vez desde SQL Editor o mediante Supabase CLI.

begin;

create extension if not exists pgcrypto;

create type public.trip_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.member_status as enum ('active', 'removed');
create type public.trip_status as enum ('draft', 'planning', 'confirmed', 'in_progress', 'finished', 'archived');
create type public.reservation_type as enum ('flight', 'train', 'bus', 'ferry', 'hotel', 'apartment', 'restaurant', 'activity', 'car', 'insurance', 'other');
create type public.reservation_status as enum ('draft', 'pending', 'confirmed', 'cancelled', 'completed');
create type public.payment_status as enum ('unpaid', 'partially_paid', 'paid', 'refunded');
create type public.activity_category as enum ('visit', 'food', 'transport', 'lodging', 'shopping', 'event', 'free_time', 'other');
create type public.activity_status as enum ('planned', 'confirmed', 'done');
create type public.expense_category as enum ('transport', 'lodging', 'food', 'activities', 'shopping', 'insurance', 'other');
create type public.notification_kind as enum ('flight', 'transport', 'lodging', 'activity', 'expense', 'group_change', 'alert');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  avatar_path text,
  base_currency text not null default 'USD' check (base_currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'America/Argentina/Buenos_Aires',
  locale text not null default 'es-AR',
  notification_preferences jsonb not null default '{"flights":true,"transport":true,"lodging":true,"activities":true,"expenses":true,"groupChanges":true,"dayBefore":true,"shortlyBefore":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  client_id text not null default gen_random_uuid()::text,
  owner_id uuid not null references public.profiles(id),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  cover_path text,
  start_date date,
  end_date date,
  base_currency text not null default 'USD' check (base_currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'America/Argentina/Buenos_Aires',
  status public.trip_status not null default 'planning',
  budget numeric(14,2) check (budget is null or budget >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (owner_id, client_id),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.trip_role not null default 'member',
  status public.member_status not null default 'active',
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (trip_id, user_id)
);

create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  client_id text not null default gen_random_uuid()::text,
  trip_id uuid not null references public.trips(id) on delete cascade,
  city text not null,
  country text not null,
  arrival_date date,
  departure_date date,
  address text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  image_path text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  unique (trip_id, client_id),
  check (departure_date is null or arrival_date is null or departure_date >= arrival_date)
);

create table public.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  client_id text not null default gen_random_uuid()::text,
  trip_id uuid not null references public.trips(id) on delete cascade,
  destination_id uuid references public.destinations(id) on delete set null,
  day date not null,
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  unique (trip_id, client_id)
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  client_id text not null default gen_random_uuid()::text,
  trip_id uuid not null references public.trips(id) on delete cascade,
  destination_id uuid references public.destinations(id) on delete set null,
  type public.reservation_type not null default 'other',
  title text not null,
  provider text not null default 'generic',
  provider_name text,
  provider_reference text,
  confirmation_code text,
  external_url text,
  start_at timestamptz not null,
  end_at timestamptz,
  timezone text,
  city text,
  origin_city text,
  destination_city text,
  origin_place text,
  destination_place text,
  service_number text,
  address text,
  traveler_details jsonb not null default '[]'::jsonb,
  status public.reservation_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  original_total_amount numeric(14,2) check (original_total_amount is null or original_total_amount >= 0),
  original_currency text check (original_currency is null or original_currency ~ '^[A-Z]{3}$'),
  exchange_rate numeric(18,8) check (exchange_rate is null or exchange_rate > 0),
  next_action text,
  available_offline boolean not null default true,
  import_source text not null default 'manual' check (import_source in ('manual','url','pdf','image','text','email')),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  unique (trip_id, client_id),
  check (end_at is null or end_at >= start_at)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  client_id text not null default gen_random_uuid()::text,
  trip_id uuid not null references public.trips(id) on delete cascade,
  itinerary_day_id uuid not null references public.itinerary_days(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete set null,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  category public.activity_category not null default 'other',
  status public.activity_status not null default 'planned',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  unique (trip_id, client_id),
  check (end_at is null or end_at >= start_at)
);

create table public.activity_participants (
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (activity_id, user_id)
);

create table public.reservation_participants (
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (reservation_id, user_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  client_id text not null default gen_random_uuid()::text,
  trip_id uuid not null references public.trips(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete set null,
  description text not null,
  category public.expense_category not null default 'other',
  category_label text,
  original_amount numeric(14,2) not null check (original_amount >= 0),
  original_currency text not null check (original_currency ~ '^[A-Z]{3}$'),
  exchange_rate numeric(18,8) not null default 1 check (exchange_rate > 0),
  converted_amount numeric(14,2) not null check (converted_amount >= 0),
  paid_by uuid not null references public.profiles(id),
  expense_date date not null,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  receipt_path text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  unique (trip_id, client_id)
);

create table public.expense_splits (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  primary key (expense_id, user_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles(id),
  reservation_id uuid references public.reservations(id) on delete set null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  kind text not null default 'other',
  available_offline boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text not null,
  action_url text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at_and_version()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at = now();
  if to_jsonb(new) ? 'version' then
    new.version = old.version + 1;
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create or replace function public.add_trip_owner()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.trip_members (trip_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'active');
  return new;
end;
$$;

create or replace function public.prevent_trip_owner_change()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'El propietario del viaje no puede modificarse directamente';
  end if;
  return new;
end;
$$;

create or replace function public.is_trip_member(target_trip_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = target_trip_id and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.trip_role_for(target_trip_id uuid)
returns public.trip_role language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.trip_members
  where trip_id = target_trip_id and user_id = auth.uid() and status = 'active'
  limit 1;
$$;

create or replace function public.can_edit_trip(target_trip_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(public.trip_role_for(target_trip_id) in ('owner', 'admin', 'member'), false);
$$;

create or replace function public.can_admin_trip(target_trip_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(public.trip_role_for(target_trip_id) in ('owner', 'admin'), false);
$$;

create or replace function public.shares_trip_with(target_user_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select target_user_id = auth.uid() or exists (
    select 1 from public.trip_members mine
    join public.trip_members theirs on theirs.trip_id = mine.trip_id
    where mine.user_id = auth.uid() and mine.status = 'active'
      and theirs.user_id = target_user_id and theirs.status = 'active'
  );
$$;

revoke all on function public.is_trip_member(uuid) from public;
revoke all on function public.trip_role_for(uuid) from public;
revoke all on function public.can_edit_trip(uuid) from public;
revoke all on function public.can_admin_trip(uuid) from public;
revoke all on function public.shares_trip_with(uuid) from public;
grant execute on function public.is_trip_member(uuid), public.trip_role_for(uuid), public.can_edit_trip(uuid), public.can_admin_trip(uuid), public.shares_trip_with(uuid) to authenticated;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create trigger on_trip_created after insert on public.trips for each row execute function public.add_trip_owner();
create trigger protect_trip_owner before update on public.trips for each row execute function public.prevent_trip_owner_change();

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','trips','destinations','itinerary_days','reservations','activities','expenses','documents','push_subscriptions'] loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at_and_version()', table_name, table_name);
  end loop;
end $$;

create index trip_members_user_idx on public.trip_members (user_id, trip_id) where status = 'active';
create index trips_active_idx on public.trips (owner_id, start_date) where deleted_at is null;
create index destinations_trip_idx on public.destinations (trip_id, position) where deleted_at is null;
create index itinerary_days_trip_idx on public.itinerary_days (trip_id, day, position) where deleted_at is null;
create index activities_day_idx on public.activities (itinerary_day_id, position) where deleted_at is null;
create index reservations_trip_start_idx on public.reservations (trip_id, start_at) where deleted_at is null;
create index expenses_trip_date_idx on public.expenses (trip_id, expense_date) where deleted_at is null;
create index notifications_due_idx on public.notifications (scheduled_for) where sent_at is null;
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.destinations enable row level security;
alter table public.itinerary_days enable row level security;
alter table public.activities enable row level security;
alter table public.activity_participants enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_participants enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

create policy profiles_select_shared on public.profiles for select to authenticated using (public.shares_trip_with(id));
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy trips_select_member on public.trips for select to authenticated using (public.is_trip_member(id));
create policy trips_insert_owner on public.trips for insert to authenticated with check (owner_id = auth.uid());
create policy trips_update_editor on public.trips for update to authenticated using (public.can_edit_trip(id)) with check (public.can_edit_trip(id));
create policy trips_delete_admin on public.trips for delete to authenticated using (public.can_admin_trip(id));

create policy trip_members_select_member on public.trip_members for select to authenticated using (public.is_trip_member(trip_id));
create policy trip_members_insert_admin on public.trip_members for insert to authenticated with check (public.can_admin_trip(trip_id));
create policy trip_members_update_admin on public.trip_members for update to authenticated using (public.can_admin_trip(trip_id)) with check (public.can_admin_trip(trip_id));
create policy trip_members_delete_admin on public.trip_members for delete to authenticated using (public.can_admin_trip(trip_id));

do $$
declare table_name text;
begin
  foreach table_name in array array['destinations','itinerary_days','activities','reservations','expenses','documents'] loop
    execute format('create policy %I_select on public.%I for select to authenticated using (public.is_trip_member(trip_id))', table_name, table_name);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (public.can_edit_trip(trip_id))', table_name, table_name);
    execute format('create policy %I_update on public.%I for update to authenticated using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id))', table_name, table_name);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (public.can_admin_trip(trip_id))', table_name, table_name);
  end loop;
end $$;

create policy activity_participants_select on public.activity_participants for select to authenticated using (exists (select 1 from public.activities a where a.id = activity_id and public.is_trip_member(a.trip_id)));
create policy activity_participants_write on public.activity_participants for all to authenticated using (exists (select 1 from public.activities a where a.id = activity_id and public.can_edit_trip(a.trip_id))) with check (exists (select 1 from public.activities a where a.id = activity_id and public.can_edit_trip(a.trip_id)));
create policy reservation_participants_select on public.reservation_participants for select to authenticated using (exists (select 1 from public.reservations r where r.id = reservation_id and public.is_trip_member(r.trip_id)));
create policy reservation_participants_write on public.reservation_participants for all to authenticated using (exists (select 1 from public.reservations r where r.id = reservation_id and public.can_edit_trip(r.trip_id))) with check (exists (select 1 from public.reservations r where r.id = reservation_id and public.can_edit_trip(r.trip_id)));
create policy expense_splits_select on public.expense_splits for select to authenticated using (exists (select 1 from public.expenses e where e.id = expense_id and public.is_trip_member(e.trip_id)));
create policy expense_splits_write on public.expense_splits for all to authenticated using (exists (select 1 from public.expenses e where e.id = expense_id and public.can_edit_trip(e.trip_id))) with check (exists (select 1 from public.expenses e where e.id = expense_id and public.can_edit_trip(e.trip_id)));

create policy notifications_select_own on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- El bucket es privado; los objetos se guardarán como: <trip_id>/<document_id>/<archivo>.
insert into storage.buckets (id, name, public, file_size_limit)
values ('trip-documents', 'trip-documents', false, 20971520)
on conflict (id) do nothing;

create policy trip_documents_select on storage.objects for select to authenticated
using (bucket_id = 'trip-documents' and public.is_trip_member(((storage.foldername(name))[1])::uuid));
create policy trip_documents_insert on storage.objects for insert to authenticated
with check (bucket_id = 'trip-documents' and public.can_edit_trip(((storage.foldername(name))[1])::uuid));
create policy trip_documents_update on storage.objects for update to authenticated
using (bucket_id = 'trip-documents' and public.can_edit_trip(((storage.foldername(name))[1])::uuid));
create policy trip_documents_delete on storage.objects for delete to authenticated
using (bucket_id = 'trip-documents' and public.can_admin_trip(((storage.foldername(name))[1])::uuid));

commit;
