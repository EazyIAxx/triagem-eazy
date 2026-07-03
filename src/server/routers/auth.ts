import { protectedProcedure, publicProcedure, router } from "@/server/trpc";

export const authRouter = router({
  /**
   * Retorna a linha local mesmo se `ativo === false` (diferente de
   * `getCurrentUser`) para que quem chamar consiga distinguir "sem cadastro
   * ainda" de "conta desativada" e mostrar a mensagem certa.
   */
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.authUser) return null;
    return ctx.prisma.user.findUnique({ where: { id: ctx.authUser.id } });
  }),

  myProfile: protectedProcedure.query(({ ctx }) => ctx.user),
});
