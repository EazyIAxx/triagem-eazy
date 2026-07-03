import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/generated/prisma/client";

export async function createTRPCContext() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  return { prisma, authUser };
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/** Exige sessão Supabase válida + linha correspondente em `usuarios`. */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.authUser) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.authUser.id },
  });

  if (!user || !user.ativo) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({ ctx: { ...ctx, user } });
});

/** Exige uma das roles informadas. Deriva role/hospitalId sempre do servidor. */
export function roleProtectedProcedure(...roles: UserRole[]) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!roles.includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx });
  });
}
