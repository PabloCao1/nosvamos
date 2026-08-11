-- Los viajeros pueden existir sin tener todavía una cuenta de NosVamos.

begin;

create table public.travelers (
  id uuid primary key default gen_random_uuid(),
  client_id text not null default gen_random_uuid()::text,
  trip_id uuid not null references public.trips(id) on delete cascade,
  linked_user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text,
  initials text not null default '',
  color text not null default '#8EDCC5',
  role public.trip_role not null default 'member',
  status public.member_status not null default 'active',
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  unique (trip_id, client_id),
  unique (trip_id, linked_user_id)
);

drop table public.activity_participants;
drop table public.reservation_participants;

alter table public.expense_splits drop constraint expense_splits_user_id_fkey;
alter table public.expense_splits rename column user_id to traveler_id;
alter table public.expense_splits add constraint expense_splits_traveler_id_fkey foreign key (traveler_id) references public.travelers(id) on delete cascade;

alter table public.expenses drop constraint expenses_paid_by_fkey;
alter table public.expenses add constraint expenses_paid_by_fkey foreign key (paid_by) references public.travelers(id);

create table public.activity_participants (
  activity_id uuid not null references public.activities(id) on delete cascade,
  traveler_id uuid not null references public.travelers(id) on delete cascade,
  primary key (activity_id, traveler_id)
);

create table public.reservation_participants (
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  traveler_id uuid not null references public.travelers(id) on delete cascade,
  primary key (reservation_id, traveler_id)
);

create trigger set_travelers_updated_at before update on public.travelers for each row execute function public.set_updated_at_and_version();
create index travelers_trip_idx on public.travelers (trip_id) where deleted_at is null;
create index travelers_linked_user_idx on public.travelers (linked_user_id) where linked_user_id is not null;

alter table public.travelers enable row level security;
alter table public.activity_participants enable row level security;
alter table public.reservation_participants enable row level security;

create policy travelers_select on public.travelers for select to authenticated using (public.is_trip_member(trip_id));
create policy travelers_insert on public.travelers for insert to authenticated with check (public.can_edit_trip(trip_id));
create policy travelers_update on public.travelers for update to authenticated using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));
create policy travelers_delete on public.travelers for delete to authenticated using (public.can_admin_trip(trip_id));

create policy activity_participants_select on public.activity_participants for select to authenticated
using (exists (select 1 from public.activities a where a.id = activity_id and public.is_trip_member(a.trip_id)));
create policy activity_participants_write on public.activity_participants for all to authenticated
using (exists (select 1 from public.activities a where a.id = activity_id and public.can_edit_trip(a.trip_id)))
with check (exists (select 1 from public.activities a where a.id = activity_id and public.can_edit_trip(a.trip_id)));

create policy reservation_participants_select on public.reservation_participants for select to authenticated
using (exists (select 1 from public.reservations r where r.id = reservation_id and public.is_trip_member(r.trip_id)));
create policy reservation_participants_write on public.reservation_participants for all to authenticated
using (exists (select 1 from public.reservations r where r.id = reservation_id and public.can_edit_trip(r.trip_id)))
with check (exists (select 1 from public.reservations r where r.id = reservation_id and public.can_edit_trip(r.trip_id)));

commit;
