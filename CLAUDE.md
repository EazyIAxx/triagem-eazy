# Triagem Eazy

## O que é

Plataforma SaaS que permite pacientes de baixa urgência (fita verde) fazerem cadastro e pré-triagem remotamente, acompanharem a fila em tempo real e serem notificados quando devem se deslocar até o hospital — reduzindo superlotação e tempo de permanência nas unidades de saúde.

PRD completo em [docs/PRD.md](docs/PRD.md). Consulte esse arquivo antes de tomar decisões de escopo, fluxo ou priorização.

## Personas

- **Paciente** — cadastro, triagem, acompanhamento de fila, notificações.
- **Profissional de Saúde** — visualiza fila, revisa triagem, atualiza status do atendimento (recepcionista/enfermeiro/médico no MVP).
- **Administrador** — gerencia usuários, configura o hospital, acompanha métricas.

## Escopo do MVP

Cadastro de pacientes → pré-triagem online → entrada na fila → acompanhamento em tempo real → notificações → painel do profissional de saúde → dashboard administrativo com autenticação e controle de acesso por perfil.

Fora do MVP (backlog): integração com HIS/prontuário eletrônico, chat paciente-hospital, upload de exames, geolocalização, check-in automático, avaliação pós-atendimento, WhatsApp, teleorientação, relatórios avançados, integração com convênios.

## Stack (decisão final, substitui a proposta original do PRD)

- **App**: Next.js 16 (App Router) full-stack — sem backend separado em NestJS.
- **API**: tRPC v11 (`src/server/routers/*.ts`), validação com Zod v4.
- **Banco**: PostgreSQL via Supabase + Prisma 7 (driver adapter `@prisma/adapter-pg`; Prisma 7 exige `prisma.config.ts` na raiz — a `datasource.url` do `schema.prisma` não é usada, veja `prisma.config.ts`).
- **Auth**: Supabase Auth (`@supabase/ssr`), sessão validada via `getUser()` sempre no servidor (nunca confiar em `getSession()` para autorização).
- **UI**: Tailwind CSS v4 + shadcn/ui (Base UI, não Radix — composição usa a prop `render={<Link .../>}`, não `asChild`).
- **Notificações**: central in-app (`Notificacao` no schema) + e-mail via Resend (`src/lib/email.ts`, disparado por `src/lib/notifications.ts`; sem `RESEND_API_KEY` configurada, o envio é pulado silenciosamente e só a notificação in-app é criada). Push (FCM) fica para depois.
- **Deploy alvo**: Vercel (app) + Supabase (Postgres/Auth).

### Notas operacionais importantes

- `next dev`/`next build` com Turbopack **crasham no Windows** deste projeto (erro nativo `0xc0000142`). Os scripts do `package.json` já usam `--webpack` (`npm run dev`/`npm run build`) — não tirar essa flag sem re-testar.
- Next.js 16 renomeou `middleware.ts` para `proxy.ts` (`src/proxy.ts`, função exportada `proxy`, roda só em runtime Node). `cookies()`/`headers()`/`params` são sempre `Promise` — sem fallback síncrono.
- Migrations/seed exigem `.env.local` com credenciais do Supabase (ver `.env.local.example`). Fluxo: `npm run db:migrate` → `npm run db:seed` → (opcional, defesa em profundidade) `npm run db:rls` para aplicar `prisma/rls.sql`.
- Seed cria 3 usuários demo (senha `TriagemEazy123!`): `admin@triagemeazy.demo`, `staff@triagemeazy.demo`, `paciente@triagemeazy.demo`.
- Autorização primária vive na camada tRPC (`protectedProcedure`/`roleProtectedProcedure` em `src/server/trpc.ts`, cada router deriva `hospitalId`/`userId` sempre do servidor). RLS (`prisma/rls.sql`) é defesa em profundidade, já que o Prisma conecta com um role fixo via pooler (não via PostgREST por request) — importa principalmente se algo passar a ler direto via Supabase Realtime no futuro.

## Design

- Referências: Material Design, Apple HIG, dashboards estilo Linear/Stripe/Vercel.
- Interface limpa, minimalista, responsiva, alta acessibilidade.
- Paleta: azul `#2563EB` (confiança/saúde), verde `#22C55E` (sucesso), amarelo `#F59E0B` (alerta), vermelho `#EF4444` (urgência/erro), cinza claro `#F8FAFC` (fundo), cinza escuro `#334155` (texto).
- Tipografia: Inter ou Geist.
- Componentes-chave: cards, tabelas de fila, stepper de triagem, modais, toasts, badges de status.

## Como trabalhar neste projeto

- Divida a construção em marcos entregáveis; priorize funcionalidade core antes de iterar.
- Teste cada marco antes de avançar para o próximo.
- Dados de pacientes são sensíveis — trate autenticação, autorização e proteção de dados como requisito de primeira classe, não como detalhe posterior.
