import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { roleProtectedProcedure, router } from "@/server/trpc";
import { enqueueNotificacao } from "@/lib/notifications";
import { enqueueAuditLog } from "@/lib/audit";
import type { FilaStatus } from "@/generated/prisma/client";

const ATIVOS = ["EM_ANALISE", "CHAMADO", "EM_ATENDIMENTO"] as const;

const STATUS_MENSAGENS: Record<FilaStatus, { titulo: string; mensagem: string }> = {
  EM_ANALISE: {
    titulo: "Pré-triagem em análise",
    mensagem: "Sua pré-triagem está sendo analisada pela equipe do hospital.",
  },
  CHAMADO: {
    titulo: "Hora de se dirigir ao hospital",
    mensagem:
      "Sua consulta está próxima. Por favor, dirija-se ao hospital agora.",
  },
  EM_ATENDIMENTO: {
    titulo: "Atendimento iniciado",
    mensagem: "Você está sendo atendido(a) agora.",
  },
  FINALIZADO: {
    titulo: "Atendimento finalizado",
    mensagem: "Seu atendimento foi concluído. Desejamos melhoras!",
  },
  CANCELADO: {
    titulo: "Atendimento cancelado",
    mensagem: "Seu atendimento na fila foi cancelado pela equipe do hospital.",
  },
};

async function assertMesmoHospital(
  prisma: import("@/generated/prisma/client").PrismaClient,
  hospitalId: string | null,
  filaEntryId: string,
) {
  if (!hospitalId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sua conta não está associada a um hospital.",
    });
  }

  const entry = await prisma.filaEntry.findUnique({
    where: { id: filaEntryId },
  });
  if (!entry || entry.hospitalId !== hospitalId) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  return entry;
}

export const staffRouter = router({
  listQueue: roleProtectedProcedure("PROFISSIONAL", "ADMIN")
    .input(
      z
        .object({ status: z.enum(["EM_ANALISE", "CHAMADO", "EM_ATENDIMENTO", "FINALIZADO", "CANCELADO"]).optional() })
        .optional(),
    )
    .query(({ ctx, input }) => {
      if (!ctx.user.hospitalId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sua conta não está associada a um hospital.",
        });
      }

      return ctx.prisma.filaEntry.findMany({
        where: {
          hospitalId: ctx.user.hospitalId,
          status: input?.status ? input.status : { in: [...ATIVOS] },
        },
        orderBy: { createdAt: "asc" },
        include: {
          paciente: { include: { user: true } },
          preTriagem: true,
        },
      });
    }),

  getPatientDetail: roleProtectedProcedure("PROFISSIONAL", "ADMIN")
    .input(z.object({ filaEntryId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertMesmoHospital(
        ctx.prisma,
        ctx.user.hospitalId,
        input.filaEntryId,
      );

      return ctx.prisma.filaEntry.findUniqueOrThrow({
        where: { id: input.filaEntryId },
        include: {
          paciente: { include: { user: true } },
          preTriagem: true,
          updatedByUser: true,
        },
      });
    }),

  updateStatus: roleProtectedProcedure("PROFISSIONAL", "ADMIN")
    .input(
      z.object({
        filaEntryId: z.string(),
        status: z.enum([
          "EM_ANALISE",
          "CHAMADO",
          "EM_ATENDIMENTO",
          "FINALIZADO",
          "CANCELADO",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entry = await assertMesmoHospital(
        ctx.prisma,
        ctx.user.hospitalId,
        input.filaEntryId,
      );

      const timestamps: Record<string, Date> = {};
      if (input.status === "CHAMADO" && !entry.chamadoAt) {
        timestamps.chamadoAt = new Date();
      }
      if (input.status === "EM_ATENDIMENTO" && !entry.atendimentoIniciadoEm) {
        timestamps.atendimentoIniciadoEm = new Date();
      }
      if (input.status === "FINALIZADO" && !entry.finalizadoEm) {
        timestamps.finalizadoEm = new Date();
      }

      const updated = await ctx.prisma.filaEntry.update({
        where: { id: input.filaEntryId },
        data: {
          status: input.status,
          updatedByUserId: ctx.user.id,
          ...timestamps,
        },
        include: { paciente: true },
      });

      const { titulo, mensagem } = STATUS_MENSAGENS[input.status];
      await enqueueNotificacao(ctx.prisma, {
        userId: updated.paciente.userId,
        tipo:
          input.status === "CHAMADO"
            ? "CHAMADA_DESLOCAMENTO"
            : "STATUS_ATUALIZADO",
        titulo,
        mensagem,
        filaEntryId: updated.id,
      });

      await enqueueAuditLog(ctx.prisma, {
        userId: ctx.user.id,
        acao: "FILA_STATUS_UPDATE",
        entidade: "FilaEntry",
        entidadeId: updated.id,
        detalhes: { de: entry.status, para: input.status },
      });

      return updated;
    }),

  addObservation: roleProtectedProcedure("PROFISSIONAL", "ADMIN")
    .input(
      z.object({
        filaEntryId: z.string(),
        observacoesStaff: z.string().max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertMesmoHospital(
        ctx.prisma,
        ctx.user.hospitalId,
        input.filaEntryId,
      );

      return ctx.prisma.filaEntry.update({
        where: { id: input.filaEntryId },
        data: {
          observacoesStaff: input.observacoesStaff,
          updatedByUserId: ctx.user.id,
        },
      });
    }),
});
