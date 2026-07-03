import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@/generated/prisma/client";

/**
 * Usuário autenticado (verificado no servidor do Supabase) + sua linha local
 * em `usuarios`. `null` se não houver sessão válida, se o registro local
 * ainda não foi criado (primeiro login antes de patient.register/completar-
 * cadastro) ou se a conta foi desativada por um admin (ver toggleUserActive).
 * Memoizado por request via React `cache`.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  return user && user.ativo ? user : null;
});
