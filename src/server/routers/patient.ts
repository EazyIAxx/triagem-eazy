import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@/generated/prisma/client";
import { publicProcedure, roleProtectedProcedure, router } from "@/server/trpc";

const cpfSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .pipe(z.string().length(11, "CPF deve ter 11 dígitos"));

const dataNascimentoSchema = z.coerce
  .date()
  .max(new Date(), "Data de nascimento não pode ser no futuro.")
  .min(
    new Date(Date.now() - 130 * 365.25 * 24 * 60 * 60 * 1000),
    "Data de nascimento inválida.",
  );

export const patientRouter = router({
  /**
   * Completa o cadastro do paciente logo após `supabase.auth.signUp`.
   * Requer sessão Supabase válida (ctx.authUser), mas ainda não existe linha
   * em `usuarios` — por isso é publicProcedure, não protectedProcedure.
   */
  register: publicProcedure
    .input(
      z.object({
        nome: z.string().min(2).max(200),
        cpf: cpfSchema,
        dataNascimento: dataNascimentoSchema,
        telefone: z.string().min(8).max(20),
        convenio: z.string().max(120).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.authUser?.email) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const existing = await ctx.prisma.user.findUnique({
        where: { id: ctx.authUser.id },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cadastro já concluído para este usuário.",
        });
      }

      const authUserId = ctx.authUser.id;
      const authUserEmail = ctx.authUser.email;

      try {
        return await ctx.prisma.user.create({
          data: {
            id: authUserId,
            email: authUserEmail,
            nome: input.nome,
            role: "PACIENTE",
            paciente: {
              create: {
                cpf: input.cpf,
                dataNascimento: input.dataNascimento,
                telefone: input.telefone,
                convenio: input.convenio,
              },
            },
          },
          include: { paciente: true },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "CPF já cadastrado para outra conta.",
          });
        }
        throw err;
      }
    }),

  getProfile: roleProtectedProcedure("PACIENTE").query(({ ctx }) =>
    ctx.prisma.paciente.findUniqueOrThrow({
      where: { userId: ctx.user.id },
      include: {
        preTriagens: { orderBy: { createdAt: "desc" } },
        filaEntries: { orderBy: { createdAt: "desc" } },
      },
    }),
  ),
});
