alter table public.reservations
  add column if not exists local_start_at timestamp without time zone,
  add column if not exists local_end_at timestamp without time zone;

update public.reservations
set
  local_start_at = start_at at time zone coalesce(timezone, 'UTC'),
  local_end_at = case when end_at is null then null else end_at at time zone coalesce(timezone, 'UTC') end
where local_start_at is null;

alter table public.activities
  add column if not exists local_start_at timestamp without time zone,
  add column if not exists local_end_at timestamp without time zone;

update public.activities as activity
set
  local_start_at = activity.start_at at time zone coalesce(trip.timezone, 'UTC'),
  local_end_at = case when activity.end_at is null then null else activity.end_at at time zone coalesce(trip.timezone, 'UTC') end
from public.trips as trip
where activity.trip_id = trip.id
  and activity.local_start_at is null;

alter table public.reservations alter column local_start_at set not null;
alter table public.activities alter column local_start_at set not null;
