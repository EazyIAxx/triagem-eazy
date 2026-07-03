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
--
-- IMPORTANTE: `prisma migrate reset` faz `DROP SCHEMA public CASCADE` +
-- `CREATE SCHEMA public`, o que apaga os grants padrão que o Supabase
-- configura no schema `public` na criação do projeto (USAGE/SELECT/etc para
-- anon e authenticated). Sem re-conceder esses grants, a API REST do
-- Supabase (PostgREST) bloqueia TUDO com "permission denied for schema
-- public" antes mesmo de avaliar RLS — o que parece seguro, mas não testa a
-- política de verdade e pode confundir quem for depurar a API REST/Realtime
-- depois. Por isso reconcedemos abaixo os grants padrão do Supabase e
-- deixamos a RLS como a barreira real.

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

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

-- Mais helpers security definer — qualquer checagem cruzada entre
-- pacientes/pre_triagens/fila_entries PRECISA passar por uma função dessas
-- (nunca um `exists (select ... from <tabela com RLS>)` direto na policy):
-- senão a policy de uma tabela reavalia a policy da outra e vice-versa,
-- causando "infinite recursion detected in policy" (42P17) — já vimos isso
-- acontecer com pacientes_select <-> fila_entries_select antes de isolar
-- essas checagens aqui.
create or replace function public.paciente_id_atual()
returns text
language sql security definer stable
set search_path = ''
as $$
  select id from public.pacientes where user_id = auth.uid()::text;
$$;

create or replace function public.paciente_tem_fila_no_meu_hospital(p_paciente_id text)
returns boolean
language sql security definer stable
set search_path = ''
as $$
  select exists (
    select 1 from public.fila_entries fe
    where fe.paciente_id = p_paciente_id
      and fe.hospital_id = public.current_hospital_id()
  );
$$;

create or replace function public.pre_triagem_tem_fila_no_meu_hospital(p_pre_triagem_id text)
returns boolean
language sql security definer stable
set search_path = ''
as $$
  select exists (
    select 1 from public.fila_entries fe
    where fe.pre_triagem_id = p_pre_triagem_id
      and fe.hospital_id = public.current_hospital_id()
  );
$$;

-- usuarios: cada um só lê a própria linha.
alter table public.usuarios enable row level security;
alter table public.usuarios force row level security;

drop policy if exists usuarios_select_self on public.usuarios;
create policy usuarios_select_self on public.usuarios
  for select
  using (id = (select auth.uid()::text));

-- hospitais: staff/admin só leem o próprio hospital.
alter table public.hospitais enable row level security;
alter table public.hospitais force row level security;

drop policy if exists hospitais_select_staff on public.hospitais;
create policy hospitais_select_staff on public.hospitais
  for select
  using (id = (select public.current_hospital_id()));

-- pacientes: o próprio paciente, ou staff/admin do hospital onde ele tem
-- entrada na fila.
alter table public.pacientes enable row level security;
alter table public.pacientes force row level security;

drop policy if exists pacientes_select on public.pacientes;
create policy pacientes_select on public.pacientes
  for select
  using (
    user_id = (select auth.uid()::text)
    or public.paciente_tem_fila_no_meu_hospital(pacientes.id)
  );

-- pre_triagens: mesma regra de acesso que pacientes, via join.
alter table public.pre_triagens enable row level security;
alter table public.pre_triagens force row level security;

drop policy if exists pre_triagens_select on public.pre_triagens;
create policy pre_triagens_select on public.pre_triagens
  for select
  using (
    pre_triagens.paciente_id = (select public.paciente_id_atual())
    or public.pre_triagem_tem_fila_no_meu_hospital(pre_triagens.id)
  );

-- fila_entries: paciente dono da entrada, ou staff/admin do mesmo hospital.
alter table public.fila_entries enable row level security;
alter table public.fila_entries force row level security;

drop policy if exists fila_entries_select on public.fila_entries;
create policy fila_entries_select on public.fila_entries
  for select
  using (
    hospital_id = (select public.current_hospital_id())
    or fila_entries.paciente_id = (select public.paciente_id_atual())
  );

-- notificacoes: cada usuário só lê/atualiza as próprias.
alter table public.notificacoes enable row level security;
alter table public.notificacoes force row level security;

drop policy if exists notificacoes_select_self on public.notificacoes;
create policy notificacoes_select_self on public.notificacoes
  for select
  using (user_id = (select auth.uid()::text));

drop policy if exists notificacoes_update_self on public.notificacoes;
create policy notificacoes_update_self on public.notificacoes
  for update
  using (user_id = (select auth.uid()::text))
  with check (user_id = (select auth.uid()::text));

-- audit_logs: nenhuma policy de select/insert/update/delete é criada —
-- com RLS habilitado e sem policies, o acesso direto via client fica negado
-- por padrão (só leitura/escrita pelo Prisma, que conecta bypassando RLS).
alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;
