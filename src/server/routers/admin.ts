import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { roleProtectedProcedure, router } from "@/server/trpc";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueAuditLog } from "@/lib/audit";
import { Prisma } from "@/generated/prisma/client";

const ATIVOS = ["EM_ANALISE", "CHAMADO", "EM_ATENDIMENTO"] as const;

function requireHospital(hospitalId: string | null) {
  if (!hospitalId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sua conta não está associada a um hospital.",
    });
  }
  return hospitalId;
}

export const adminRouter = router({
  getMetrics: roleProtectedProcedure("ADMIN").query(async ({ ctx }) => {
    const hospitalId = requireHospital(ctx.user.hospitalId);
    const inicioDoDia = new Date();
    inicioDoDia.setHours(0, 0, 0, 0);

    const [pacientesNaFila, atendimentosHoje, hospital, finalizadosRecentes] =
      await Promise.all([
        ctx.prisma.filaEntry.count({
          where: { hospitalId, status: { in: [...ATIVOS] } },
        }),
        ctx.prisma.filaEntry.count({
          where: {
            hospitalId,
            status: "FINALIZADO",
            finalizadoEm: { gte: inicioDoDia },
          },
        }),
        ctx.prisma.hospital.findUniqueOrThrow({ where: { id: hospitalId } }),
        ctx.prisma.filaEntry.findMany({
          where: {
            hospitalId,
            status: "FINALIZADO",
            atendimentoIniciadoEm: { not: null },
            finalizadoEm: { not: null },
          },
          orderBy: { finalizadoEm: "desc" },
          take: 20,
          select: { atendimentoIniciadoEm: true, finalizadoEm: true },
        }),
      ]);

    const duracoesMin = finalizadosRecentes
      .filter((f) => f.atendimentoIniciadoEm && f.finalizadoEm)
      .map(
        (f) =>
          (f.finalizadoEm!.getTime() - f.atendimentoIniciadoEm!.getTime()) /
          60000,
      );
    const tempoMedioEsperaMin =
      duracoesMin.length > 0
        ? Math.round(
            duracoesMin.reduce((a, b) => a + b, 0) / duracoesMin.length,
          )
        : hospital.tempoMedioAtendimentoMin;

    return {
      pacientesNaFila,
      atendimentosHoje,
      tempoMedioEsperaMin,
      hospital: { nome: hospital.nome, slug: hospital.slug },
    };
  }),

  listUsers: roleProtectedProcedure("ADMIN").query(({ ctx }) => {
    const hospitalId = requireHospital(ctx.user.hospitalId);
    return ctx.prisma.user.findMany({
      where: { hospitalId },
      orderBy: { createdAt: "desc" },
    });
  }),

  /**
   * Cria conta de staff (PROFISSIONAL ou ADMIN) via Supabase Auth Admin API
   * e envia um convite por e-mail para definição de senha.
   */
  createStaffUser: roleProtectedProcedure("ADMIN")
    .input(
      z.object({
        email: z.email(),
        nome: z.string().min(2).max(200),
        role: z.enum(["PROFISSIONAL", "ADMIN"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const hospitalId = requireHospital(ctx.user.hospitalId);

      const supabaseAdmin = createAdminClient();
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        input.email,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/definir-senha`,
        },
      );

      if (error || !data.user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error?.message ?? "Não foi possível convidar este e-mail.",
        });
      }

      let created;
      try {
        created = await ctx.prisma.user.create({
          data: {
            id: data.user.id,
            email: input.email,
            nome: input.nome,
            role: input.role,
            hospitalId,
          },
        });
      } catch (err) {
        // Sem isso o usuário do Supabase Auth ficaria órfão (convidado, sem
        // linha local), bloqueando qualquer nova tentativa com o mesmo e-mail.
        await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => {});

        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Já existe um usuário cadastrado com este e-mail.",
          });
        }
        throw err;
      }

      await enqueueAuditLog(ctx.prisma, {
        userId: ctx.user.id,
        acao: "USER_INVITE",
        entidade: "User",
        entidadeId: created.id,
        detalhes: { email: input.email, role: input.role },
      });

      return created;
    }),

  updateUserRole: roleProtectedProcedure("ADMIN")
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["PACIENTE", "PROFISSIONAL", "ADMIN"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const hospitalId = requireHospital(ctx.user.hospitalId);
      if (input.userId === ctx.user.id && input.role !== "ADMIN") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Você não pode remover sua própria permissão de admin.",
        });
      }

      const target = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
      });
      if (!target || target.hospitalId !== hospitalId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const updated = await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });

      await enqueueAuditLog(ctx.prisma, {
        userId: ctx.user.id,
        acao: "USER_ROLE_CHANGE",
        entidade: "User",
        entidadeId: input.userId,
        detalhes: { de: target.role, para: input.role },
      });

      return updated;
    }),

  toggleUserActive: roleProtectedProcedure("ADMIN")
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const hospitalId = requireHospital(ctx.user.hospitalId);
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Você não pode desativar a si mesmo.",
        });
      }

      const target = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
      });
      if (!target || target.hospitalId !== hospitalId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const updated = await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { ativo: !target.ativo },
      });

      await enqueueAuditLog(ctx.prisma, {
        userId: ctx.user.id,
        acao: updated.ativo ? "USER_ACTIVATE" : "USER_DEACTIVATE",
        entidade: "User",
        entidadeId: input.userId,
      });

      return updated;
    }),

  updateHospitalConfig: roleProtectedProcedure("ADMIN")
    .input(
      z.object({
        nome: z.string().min(2).max(200).optional(),
        tempoMedioAtendimentoMin: z.number().int().min(1).max(600).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const hospitalId = requireHospital(ctx.user.hospitalId);
      return ctx.prisma.hospital.update({
        where: { id: hospitalId },
        data: input,
      });
    }),
});
