-- Permite snapshots temporários de salas ativas no mesmo armazenamento privado.
alter table public.cucando_records
  drop constraint if exists cucando_records_kind_check;

alter table public.cucando_records
  add constraint cucando_records_kind_check
  check (kind in ('game', 'session', 'import', 'room'));
