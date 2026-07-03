# Triagem Eazy

Cadastro e pré-triagem remota para pacientes de baixa urgência, com acompanhamento de fila em tempo real. Contexto de produto completo em [docs/PRD.md](docs/PRD.md) e [CLAUDE.md](CLAUDE.md).

## Stack

Next.js 16 (App Router) + tRPC v11 + Prisma 7 + Supabase (Postgres + Auth) + Tailwind v4 + shadcn/ui. Ver [CLAUDE.md](CLAUDE.md) para detalhes e decisões (inclusive o motivo do `--webpack` nos scripts).

## Setup

1. `npm install`
2. Crie um projeto em [supabase.com/dashboard](https://supabase.com/dashboard) e copie `.env.local.example` para `.env.local`, preenchendo `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API / Database no dashboard).
3. `npm run db:migrate` — cria as tabelas.
4. `npm run db:rls` — aplica as policies de Row Level Security (`prisma/rls.sql`, defesa em profundidade).
5. `npm run db:seed` — cria um hospital demo e três usuários (`admin@triagemeazy.demo`, `staff@triagemeazy.demo`, `paciente@triagemeazy.demo`, senha `TriagemEazy123!`).
6. `npm run dev` — sobe em [http://localhost:3000](http://localhost:3000).

### E-mail de notificação (Resend) — opcional

Toda notificação in-app (mudança de status, chamada para o hospital) também tenta sair por e-mail via [Resend](https://resend.com). Sem configurar nada, isso é pulado silenciosamente — a notificação in-app continua funcionando normalmente.

1. Crie uma conta em [resend.com](https://resend.com) e gere uma API key em [resend.com/api-keys](https://resend.com/api-keys).
2. Adicione no `.env.local`:
   ```
   RESEND_API_KEY="re_xxx"
   RESEND_FROM_EMAIL="Triagem Eazy <onboarding@resend.dev>"
   ```
3. **Contas novas do Resend entram em modo sandbox**: só conseguem enviar para o e-mail dono da conta, qualquer outro destinatário falha com `403 validation_error` (fica só no log do servidor, não quebra a aplicação). Para enviar para pacientes/staff de verdade:
   - Verifique um domínio próprio em [resend.com/domains](https://resend.com/domains) (adiciona uns registros DNS — SPF/DKIM — no seu provedor de domínio).
   - Depois de verificado, troque `RESEND_FROM_EMAIL` para usar esse domínio, ex: `Triagem Eazy <notificacoes@seudominio.com>`.

## Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` / `npm run build` | Dev server / build de produção (via webpack — Turbopack tem um bug nativo neste ambiente Windows) |
| `npm run lint` | ESLint |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:generate` | Regenera o Prisma Client (`src/generated/prisma`) |
| `npm run db:seed` | Popula hospital + usuários demo |
| `npm run db:studio` | Prisma Studio |
| `npm run db:rls` | Aplica `prisma/rls.sql` no banco configurado |

## Estrutura

- `src/app/{paciente,staff,admin}` — áreas autenticadas por role, cada uma com seu `layout.tsx` fazendo o gate de acesso.
- `src/app/(auth)` — login, registro, recuperação de senha.
- `src/server/routers` — routers tRPC (autorização sempre derivada do servidor, nunca do client).
- `prisma/schema.prisma` + `prisma/rls.sql` — schema e policies de RLS.
