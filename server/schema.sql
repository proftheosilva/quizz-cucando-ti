-- Execute no editor SQL da instância Insforge antes de configurar INSFORGE_BASE_URL.
create table if not exists public.cucando_records (
  id uuid primary key,
  kind text not null check (kind in ('game','session','import')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists cucando_records_kind_created_idx on public.cucando_records (kind, created_at desc);
alter table public.cucando_records enable row level security;
-- Nenhuma política pública: leitura e escrita ocorrem apenas no backend por rota administrativa.
