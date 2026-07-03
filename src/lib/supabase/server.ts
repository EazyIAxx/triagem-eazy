import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cria um cliente Supabase por request em Server Components/Route Handlers/Server Actions.
 * `setAll` pode falhar em Server Components (cookies somente-leitura) — é seguro ignorar
 * o erro aqui porque o `proxy.ts` já cuida do refresh de sessão a cada navegação.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // chamado a partir de um Server Component — o proxy.ts cuida do refresh.
          }
        },
      },
    },
  );
}
