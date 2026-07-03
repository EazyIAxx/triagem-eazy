import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { roleProtectedProcedure, router } from "@/server/trpc";
import { Prisma } from "@/generated/prisma/client";

export const triageRouter = router({
  /**
   * Cria a pré-triagem e já entra na fila do hospital (MVP de hospital único —
   * usa o primeiro hospital cadastrado; ver docs/PRD.md seção 3.3).
   */
  submit: roleProtectedProcedure("PACIENTE")
    .input(
      z.object({
        queixaPrincipal: z.string().min(3).max(500),
        sintomas: z.array(z.string().min(1).max(80)).min(1).max(20),
        descricaoLivre: z.string().max(1000).optional(),
        duracaoSintomas: z.string().max(80).optional(),
        nivelDor: z.number().int().min(0).max(10).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const paciente = await ctx.prisma.paciente.findUnique({
        where: { userId: ctx.user.id },
      });
      if (!paciente) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Complete seu cadastro antes de fazer a pré-triagem.",
        });
      }

      const hospital = await ctx.prisma.hospital.findFirst();
      if (!hospital) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Nenhum hospital configurado no sistema ainda.",
        });
      }

      try {
        // Isolamento serializable para que o check "já tem triagem em
        // andamento" + as duas criações sejam atômicos mesmo sob submits
        // concorrentes (ex: duplo clique, duas abas) — a transação perdedora
        // falha com P2034 e vira CONFLICT abaixo.
        return await ctx.prisma.$transaction(
          async (tx) => {
            const emAndamento = await tx.filaEntry.findFirst({
              where: {
                pacienteId: paciente.id,
                status: { in: ["EM_ANALISE", "CHAMADO", "EM_ATENDIMENTO"] },
              },
            });
            if (emAndamento) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Você já tem uma triagem em andamento.",
              });
            }

            const preTriagem = await tx.preTriagem.create({
              data: {
                pacienteId: paciente.id,
                queixaPrincipal: input.queixaPrincipal,
                sintomas: input.sintomas,
                descricaoLivre: input.descricaoLivre,
                duracaoSintomas: input.duracaoSintomas,
                nivelDor: input.nivelDor,
              },
            });

            const filaEntry = await tx.filaEntry.create({
              data: {
                hospitalId: hospital.id,
                pacienteId: paciente.id,
                preTriagemId: preTriagem.id,
              },
            });

            return { preTriagem, filaEntry };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2034"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Você já tem uma triagem em andamento.",
          });
        }
        throw err;
      }
    }),

  getMine: roleProtectedProcedure("PACIENTE").query(async ({ ctx }) => {
    const paciente = await ctx.prisma.paciente.findUnique({
      where: { userId: ctx.user.id },
    });
    if (!paciente) return [];

    return ctx.prisma.preTriagem.findMany({
      where: { pacienteId: paciente.id },
      orderBy: { createdAt: "desc" },
      include: { filaEntry: true },
    });
  }),
});
