alter table public.reservations
  add column if not exists paid_by uuid references public.travelers(id) on delete set null,
  add column if not exists pay_on_arrival boolean not null default false;
