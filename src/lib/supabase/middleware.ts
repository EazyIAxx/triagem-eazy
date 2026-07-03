import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/paciente", "/staff", "/admin"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Atualiza a sessão do Supabase a cada navegação (refresh token) e bloqueia
 * acesso não autenticado às áreas logadas. Autorização por role acontece nos
 * layouts de cada área (src/app/{paciente,staff,admin}/layout.tsx), não aqui —
 * checar role exigiria uma consulta ao Prisma a cada request.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    if (process.env.NODE_ENV === "production") {
      // Em produção isso é uma falha de configuração real — melhor derrubar
      // a request do que silenciosamente deixar passar sem autenticação.
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes em produção.",
      );
    }
    // Supabase ainda não configurado (.env.local) — deixa passar sem auth em vez
    // de derrubar o dev server. Ver .env.local.example / pré-requisito externo no plano.
    console.warn(
      "[proxy] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes — pulando refresh de sessao.",
    );
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected(request.nextUrl.pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
