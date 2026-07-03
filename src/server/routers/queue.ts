import { roleProtectedProcedure, router } from "@/server/trpc";

const ATIVOS = ["EM_ANALISE", "CHAMADO", "EM_ATENDIMENTO"] as const;

export const queueRouter = router({
  /** Posição do paciente logado na fila do hospital + ETA estimado. */
  getMyPosition: roleProtectedProcedure("PACIENTE").query(async ({ ctx }) => {
    const paciente = await ctx.prisma.paciente.findUnique({
      where: { userId: ctx.user.id },
    });
    if (!paciente) return null;

    // Prioriza uma entrada ativa; se não houver, mostra a mais recente
    // finalizada/cancelada para dar um encerramento visual ao paciente em
    // vez de simplesmente sumir com o estado (ver src/app/paciente/fila).
    const minhaEntrada =
      (await ctx.prisma.filaEntry.findFirst({
        where: { pacienteId: paciente.id, status: { in: [...ATIVOS] } },
        include: { hospital: true, preTriagem: true },
        orderBy: { createdAt: "desc" },
      })) ??
      (await ctx.prisma.filaEntry.findFirst({
        where: { pacienteId: paciente.id },
        include: { hospital: true, preTriagem: true },
        orderBy: { createdAt: "desc" },
      }));
    if (!minhaEntrada) return null;

    const ativa = (ATIVOS as readonly string[]).includes(minhaEntrada.status);

    const posicao = ativa
      ? await ctx.prisma.filaEntry.count({
          where: {
            hospitalId: minhaEntrada.hospitalId,
            status: { in: [...ATIVOS] },
            createdAt: { lte: minhaEntrada.createdAt },
          },
        })
      : 0;

    const etaMinutos = posicao * minhaEntrada.hospital.tempoMedioAtendimentoMin;

    return {
      id: minhaEntrada.id,
      status: minhaEntrada.status,
      posicao,
      etaMinutos,
      queixaPrincipal: minhaEntrada.preTriagem.queixaPrincipal,
      criadoEm: minhaEntrada.createdAt,
      chamadoEm: minhaEntrada.chamadoAt,
    };
  }),
});
