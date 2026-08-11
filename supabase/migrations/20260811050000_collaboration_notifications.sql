create or replace function public.notify_trip_members()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  target_trip_id uuid := new.trip_id;
  actor uuid := auth.uid();
  notification_kind public.notification_kind;
  notification_title text;
  notification_body text;
begin
  if tg_table_name = 'expenses' then
    notification_kind := 'expense';
    notification_title := 'Nuevo movimiento en gastos';
    notification_body := new.description;
  else
    notification_kind := 'group_change';
    notification_title := 'Cambios en el viaje';
    notification_body := case when tg_table_name = 'reservations' then new.title else new.title end;
  end if;

  insert into public.notifications (user_id, trip_id, reservation_id, kind, title, body, action_url, scheduled_for)
  select recipient.user_id, target_trip_id,
    case when tg_table_name = 'reservations' then new.id else null end,
    notification_kind, notification_title, notification_body,
    case when tg_table_name = 'expenses' then '/viaje/' || target_trip_id || '/gastos' else '/viaje/' || target_trip_id end,
    now()
  from (
    select owner_id as user_id from public.trips where id = target_trip_id
    union
    select user_id from public.trip_members where trip_id = target_trip_id and status = 'active'
  ) recipient
  where recipient.user_id is distinct from actor;
  return new;
end;
$$;

create trigger notify_expense_change after insert or update on public.expenses for each row execute function public.notify_trip_members();
create trigger notify_reservation_change after insert or update on public.reservations for each row execute function public.notify_trip_members();
create trigger notify_activity_change after insert or update on public.activities for each row execute function public.notify_trip_members();
