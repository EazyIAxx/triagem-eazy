"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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

/**
 * Destino do link de convite (admin.createStaffUser) e de recuperação de
 * senha (esqueci-senha). O client do Supabase processa automaticamente o
 * token/code presente na URL (`detectSessionInUrl`) e estabelece a sessão —
 * só então é seguro chamar `updateUser({ password })`.
 */
export default function DefinirSenhaPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"verificando" | "pronto" | "invalido">(
    "verificando",
  );
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const meQuery = trpc.auth.me.useQuery(undefined, { enabled: false });

  useEffect(() => {
    const supabase = createClient();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) setStatus("pronto");
        if (event === "SIGNED_OUT") setStatus("invalido");
      },
    );

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStatus("pronto");
      } else {
        // Dá um tempo para o processamento do link (hash/code na URL) antes
        // de desistir e mostrar "link inválido".
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: retry }) => {
            setStatus(retry.session ? "pronto" : "invalido");
          });
        }, 1500);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    if (senha.length < 8) {
      setErro("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) {
        toast.error("Não foi possível definir a senha. Tente novamente.");
        return;
      }

      toast.success("Senha definida com sucesso!");
      const { data: me } = await meQuery.refetch();
      if (!me) {
        router.push("/completar-cadastro");
      } else if (me.role === "PACIENTE") {
        router.push("/paciente/fila");
      } else if (me.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/staff/fila");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "verificando") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Verificando seu link...
        </CardContent>
      </Card>
    );
  }

  if (status === "invalido") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link inválido ou expirado</CardTitle>
          <CardDescription>
            Solicite um novo link de acesso e tente novamente.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Definir senha</CardTitle>
        <CardDescription>
          Escolha uma senha para acessar sua conta na Triagem Eazy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha">Nova senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmarSenha">Confirmar senha</Label>
            <Input
              id="confirmarSenha"
              type="password"
              autoComplete="new-password"
              value={confirmarSenha}
              onChange={(event) => setConfirmarSenha(event.target.value)}
              required
            />
          </div>
          {erro && <p className="text-xs text-destructive">{erro}</p>}
          <Button type="submit" className="mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Definir senha e continuar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
