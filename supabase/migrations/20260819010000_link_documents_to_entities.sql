begin;

alter table public.documents
  add column expense_id uuid references public.expenses(id) on delete cascade,
  add column activity_id uuid references public.activities(id) on delete cascade;

create index documents_expense_idx on public.documents (expense_id) where expense_id is not null and deleted_at is null;
create index documents_activity_idx on public.documents (activity_id) where activity_id is not null and deleted_at is null;

commit;
