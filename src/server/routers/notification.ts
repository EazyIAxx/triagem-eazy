import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/server/trpc";

export const notificationRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.notificacao.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ),

  unreadCount: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.notificacao.count({
      where: { userId: ctx.user.id, lida: false },
    }),
  ),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const notificacao = await ctx.prisma.notificacao.findUnique({
        where: { id: input.id },
      });
      if (!notificacao || notificacao.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.prisma.notificacao.update({
        where: { id: input.id },
        data: { lida: true },
      });
    }),

  markAllRead: protectedProcedure.mutation(({ ctx }) =>
    ctx.prisma.notificacao.updateMany({
      where: { userId: ctx.user.id, lida: false },
      data: { lida: true },
    }),
  ),
});
