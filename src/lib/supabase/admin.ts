import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com service role — bypassa RLS e pode gerenciar usuários do Auth.
 * Só deve ser importado de código que roda exclusivamente no servidor
 * (routers tRPC, scripts). `server-only` garante um erro de build se algum
 * dia acabar num bundle de cliente.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
