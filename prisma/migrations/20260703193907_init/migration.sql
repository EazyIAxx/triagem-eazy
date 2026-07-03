-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('PACIENTE', 'PROFISSIONAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "fila_status" AS ENUM ('EM_ANALISE', 'CHAMADO', 'EM_ATENDIMENTO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "notificacao_tipo" AS ENUM ('CADASTRO_APROVADO', 'CHAMADA_DESLOCAMENTO', 'STATUS_ATUALIZADO', 'SISTEMA');

-- CreateTable
CREATE TABLE "hospitais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tempo_medio_atendimento_min" INTEGER NOT NULL DEFAULT 20,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hospitais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'PACIENTE',
    "hospital_id" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "data_nascimento" DATE NOT NULL,
    "telefone" TEXT NOT NULL,
    "convenio" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_triagens" (
    "id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "queixa_principal" TEXT NOT NULL,
    "sintomas" TEXT[],
    "descricao_livre" TEXT,
    "duracao_sintomas" TEXT,
    "nivel_dor" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pre_triagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fila_entries" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "pre_triagem_id" TEXT NOT NULL,
    "status" "fila_status" NOT NULL DEFAULT 'EM_ANALISE',
    "observacoes_staff" TEXT,
    "updated_by_user_id" TEXT,
    "chamado_at" TIMESTAMPTZ(3),
    "atendimento_iniciado_em" TIMESTAMPTZ(3),
    "finalizado_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fila_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fila_entry_id" TEXT,
    "tipo" "notificacao_tipo" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidade_id" TEXT NOT NULL,
    "detalhes" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hospitais_slug_key" ON "hospitais"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_hospital_id_idx" ON "usuarios"("hospital_id");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_user_id_key" ON "pacientes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_cpf_key" ON "pacientes"("cpf");

-- CreateIndex
CREATE INDEX "pre_triagens_paciente_id_idx" ON "pre_triagens"("paciente_id");

-- CreateIndex
CREATE UNIQUE INDEX "fila_entries_pre_triagem_id_key" ON "fila_entries"("pre_triagem_id");

-- CreateIndex
CREATE INDEX "fila_entries_hospital_id_status_idx" ON "fila_entries"("hospital_id", "status");

-- CreateIndex
CREATE INDEX "fila_entries_paciente_id_idx" ON "fila_entries"("paciente_id");

-- CreateIndex
CREATE INDEX "fila_entries_updated_by_user_id_idx" ON "fila_entries"("updated_by_user_id");

-- CreateIndex
CREATE INDEX "notificacoes_user_id_lida_idx" ON "notificacoes"("user_id", "lida");

-- CreateIndex
CREATE INDEX "notificacoes_fila_entry_id_idx" ON "notificacoes"("fila_entry_id");

-- CreateIndex
CREATE INDEX "audit_logs_entidade_entidade_id_idx" ON "audit_logs"("entidade", "entidade_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_triagens" ADD CONSTRAINT "pre_triagens_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fila_entries" ADD CONSTRAINT "fila_entries_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fila_entries" ADD CONSTRAINT "fila_entries_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fila_entries" ADD CONSTRAINT "fila_entries_pre_triagem_id_fkey" FOREIGN KEY ("pre_triagem_id") REFERENCES "pre_triagens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fila_entries" ADD CONSTRAINT "fila_entries_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_fila_entry_id_fkey" FOREIGN KEY ("fila_entry_id") REFERENCES "fila_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
