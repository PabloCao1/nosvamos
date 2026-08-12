begin;

create table if not exists public.trip_invitations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  email text not null,
  invited_by uuid not null default auth.uid() references public.profiles(id),
  role public.trip_role not null default 'member',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (trip_id, email)
);

alter table public.trip_invitations enable row level security;

create policy trip_invitations_select_admin on public.trip_invitations
for select to authenticated using (public.can_admin_trip(trip_id));
create policy trip_invitations_insert_admin on public.trip_invitations
for insert to authenticated with check (public.can_admin_trip(trip_id) and invited_by = auth.uid());
create policy trip_invitations_update_admin on public.trip_invitations
for update to authenticated using (public.can_admin_trip(trip_id)) with check (public.can_admin_trip(trip_id));

create or replace function public.invite_trip_member_by_email(target_trip_id uuid, target_email text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare target_user_id uuid;
begin
  if not public.can_admin_trip(target_trip_id) then raise exception 'No autorizado'; end if;
  target_email := lower(trim(target_email));
  insert into public.trip_invitations (trip_id, email, invited_by)
  values (target_trip_id, target_email, auth.uid())
  on conflict (trip_id, email) do update set status = 'pending', invited_by = auth.uid();

  select id into target_user_id from public.profiles where lower(email) = target_email limit 1;
  if target_user_id is null then return false; end if;

  insert into public.trip_members (trip_id, user_id, role, status, removed_at)
  values (target_trip_id, target_user_id, 'member', 'active', null)
  on conflict (trip_id, user_id) do update set status = 'active', removed_at = null;
  update public.travelers set linked_user_id = target_user_id
    where trip_id = target_trip_id and lower(email) = target_email;
  update public.trip_invitations set status = 'accepted', accepted_at = now()
    where trip_id = target_trip_id and email = target_email;
  return true;
end;
$$;

revoke all on function public.invite_trip_member_by_email(uuid, text) from public;
grant execute on function public.invite_trip_member_by_email(uuid, text) to authenticated;

create or replace function public.claim_pending_trip_invitations()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.trip_members (trip_id, user_id, role, status)
  select trip_id, new.id, role, 'active' from public.trip_invitations
  where lower(email) = lower(new.email) and status = 'pending'
  on conflict (trip_id, user_id) do update set status = 'active', removed_at = null;
  update public.travelers set linked_user_id = new.id
    where lower(email) = lower(new.email) and linked_user_id is null;
  update public.trip_invitations set status = 'accepted', accepted_at = now()
    where lower(email) = lower(new.email) and status = 'pending';
  return new;
end;
$$;

drop trigger if exists claim_trip_invitations_after_profile on public.profiles;
create trigger claim_trip_invitations_after_profile after insert or update of email on public.profiles
for each row execute function public.claim_pending_trip_invitations();

commit;
