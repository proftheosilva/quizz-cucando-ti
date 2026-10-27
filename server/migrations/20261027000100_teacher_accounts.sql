-- Habilita contas docentes independentes e impede e-mails duplicados.
alter table public.cucando_records
  drop constraint if exists cucando_records_kind_check;

alter table public.cucando_records
  add constraint cucando_records_kind_check
  check (kind in ('game', 'session', 'import', 'room', 'catalog', 'student', 'review', 'teacher'));

create unique index if not exists cucando_records_teacher_email_idx
  on public.cucando_records ((lower(payload->>'email')))
  where kind = 'teacher';
