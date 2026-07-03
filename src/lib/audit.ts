import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

/** Registra uma ação sensível (mudança de status, papel de usuário, etc). */
export function enqueueAuditLog(
  prisma: Tx,
  input: {
    userId: string;
    acao: string;
    entidade: string;
    entidadeId: string;
    detalhes?: Prisma.InputJsonValue;
  },
) {
  return prisma.auditLog.create({ data: input });
}
