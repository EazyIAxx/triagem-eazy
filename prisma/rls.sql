-- Row Level Security — Triagem Eazy
--
-- CONTEXTO IMPORTANTE: a API (tRPC via Prisma, ver src/server/trpc.ts) conecta
-- ao Postgres com um role fixo através do pooler do Supabase, NÃO via
-- PostgREST com o JWT por request — então essas policies NÃO são a barreira
-- de autorização primária para as chamadas da aplicação hoje (isso é feito em
-- src/server/trpc.ts + cada router, que sempre derivam hospitalId/userId do
-- servidor). RLS aqui é defesa em profundidade e, principalmente, a barreira
-- que protege qualquer leitura feita diretamente pelo Supabase client
-- (anon/authenticated key) — por exemplo, se no futuro `/paciente/fila` ou o
-- painel de staff migrarem de polling para Supabase Realtime
-- (`postgres_changes`), o Realtime respeita essas policies de SELECT.
--
-- Aplicar após a primeira `prisma migrate dev`, por exemplo:
--   psql "$DIRECT_URL" -f prisma/rls.sql
-- (ou colar no SQL editor do dashboard do Supabase).

-- Helpers (security definer — leem usuarios sem re-entrar em RLS).
create or replace function public.current_hospital_id()
returns text
language sql security definer stable
set search_path = ''
as $$
  select hospital_id from public.usuarios where id = auth.uid()::text;
$$;

create or replace function public.current_role()
returns public.user_role
language sql security definer stable
set search_path = ''
as $$
  select role from public.usuarios where id = auth.uid()::text;
$$;

-- usuarios: cada um só lê a própria linha.
alter table public.usuarios enable row level security;
alter table public.usuarios force row level security;

create policy usuarios_select_self on public.usuarios
  for select
  using (id = (select auth.uid()::text));

-- hospitais: staff/admin só leem o próprio hospital.
alter table public.hospitais enable row level security;
alter table public.hospitais force row level security;

create policy hospitais_select_staff on public.hospitais
  for select
  using (id = (select public.current_hospital_id()));

-- pacientes: o próprio paciente, ou staff/admin do hospital onde ele tem
-- entrada na fila.
alter table public.pacientes enable row level security;
alter table public.pacientes force row level security;

create policy pacientes_select on public.pacientes
  for select
  using (
    user_id = (select auth.uid()::text)
    or exists (
      select 1 from public.fila_entries fe
      where fe.paciente_id = pacientes.id
        and fe.hospital_id = (select public.current_hospital_id())
    )
  );

-- pre_triagens: mesma regra de acesso que pacientes, via join.
alter table public.pre_triagens enable row level security;
alter table public.pre_triagens force row level security;

create policy pre_triagens_select on public.pre_triagens
  for select
  using (
    exists (
      select 1 from public.pacientes p
      where p.id = pre_triagens.paciente_id
        and p.user_id = (select auth.uid()::text)
    )
    or exists (
      select 1 from public.fila_entries fe
      where fe.pre_triagem_id = pre_triagens.id
        and fe.hospital_id = (select public.current_hospital_id())
    )
  );

-- fila_entries: paciente dono da entrada, ou staff/admin do mesmo hospital.
alter table public.fila_entries enable row level security;
alter table public.fila_entries force row level security;

create policy fila_entries_select on public.fila_entries
  for select
  using (
    hospital_id = (select public.current_hospital_id())
    or exists (
      select 1 from public.pacientes p
      where p.id = fila_entries.paciente_id
        and p.user_id = (select auth.uid()::text)
    )
  );

-- notificacoes: cada usuário só lê/atualiza as próprias.
alter table public.notificacoes enable row level security;
alter table public.notificacoes force row level security;

create policy notificacoes_select_self on public.notificacoes
  for select
  using (user_id = (select auth.uid()::text));

create policy notificacoes_update_self on public.notificacoes
  for update
  using (user_id = (select auth.uid()::text))
  with check (user_id = (select auth.uid()::text));

-- audit_logs: nenhuma policy de select/insert/update/delete é criada —
-- com RLS habilitado e sem policies, o acesso direto via client fica negado
-- por padrão (só leitura/escrita pelo Prisma, que conecta bypassando RLS).
alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;
