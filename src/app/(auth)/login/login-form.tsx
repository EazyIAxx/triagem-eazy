"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function mensagemErroLogin(mensagem: string) {
  if (/invalid login credentials/i.test(mensagem)) {
    return "E-mail ou senha incorretos.";
  }
  if (/email not confirmed/i.test(mensagem)) {
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  }
  return "Não foi possível entrar. Tente novamente.";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email || !senha) {
      toast.error("Preencha e-mail e senha.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        toast.error(mensagemErroLogin(error.message));
        return;
      }

      // Sessão do Supabase existe, mas o cadastro de paciente pode não ter
      // sido concluído (ex: usuário confirmou o e-mail e voltou pra logar
      // sem nunca ter passado por `patient.register`).
      const me = await utils.auth.me.fetch();
      if (!me) {
        router.push("/completar-cadastro");
        return;
      }

      if (!me.ativo) {
        await supabase.auth.signOut();
        toast.error(
          "Sua conta foi desativada. Fale com o administrador do hospital.",
        );
        return;
      }

      const next = searchParams.get("next");
      if (next && next.startsWith("/")) {
        router.push(next);
      } else if (me.role === "ADMIN") {
        router.push("/admin");
      } else if (me.role === "PROFISSIONAL") {
        router.push("/staff/fila");
      } else {
        router.push("/paciente/fila");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>
          Acesse sua conta para acompanhar sua triagem e a fila de
          atendimento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="senha">Senha</Label>
              <Link
                href="/esqueci-senha"
                className="text-xs text-primary hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
            <Input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
            />
          </div>
          <Button type="submit" className="mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link href="/registro" className="text-primary hover:underline">
            Cadastre-se
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
