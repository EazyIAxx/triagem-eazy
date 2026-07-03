"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/routers/_app";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FormState = {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  convenio: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialState: FormState = {
  nome: "",
  email: "",
  senha: "",
  confirmarSenha: "",
  cpf: "",
  dataNascimento: "",
  telefone: "",
  convenio: "",
};

function validar(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.nome.trim() || form.nome.trim().length < 2) {
    errors.nome = "Informe seu nome completo.";
  }
  if (!form.email.trim()) {
    errors.email = "Informe seu e-mail.";
  }
  if (!form.senha || form.senha.length < 8) {
    errors.senha = "A senha deve ter pelo menos 8 caracteres.";
  }
  if (form.confirmarSenha !== form.senha) {
    errors.confirmarSenha = "As senhas não coincidem.";
  }
  const cpfDigits = form.cpf.replace(/\D/g, "");
  if (cpfDigits.length !== 11) {
    errors.cpf = "CPF deve ter 11 dígitos.";
  }
  if (!form.dataNascimento) {
    errors.dataNascimento = "Informe sua data de nascimento.";
  }
  if (!form.telefone.trim() || form.telefone.replace(/\D/g, "").length < 8) {
    errors.telefone = "Informe um telefone válido.";
  }

  return errors;
}

function mensagemErroSignUp(mensagem: string) {
  if (/already registered|already exists|user already/i.test(mensagem)) {
    return "Este e-mail já está cadastrado. Tente entrar.";
  }
  if (/password/i.test(mensagem)) {
    return "Senha inválida. Use pelo menos 8 caracteres.";
  }
  return "Não foi possível concluir o cadastro. Tente novamente.";
}

export default function RegistroPage() {
  const router = useRouter();
  const registerMutation = trpc.patient.register.useMutation();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);

  function updateField<K extends keyof FormState>(field: K, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validar(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.senha,
      });

      if (error) {
        toast.error(mensagemErroSignUp(error.message));
        return;
      }

      if (!data.session) {
        setAguardandoConfirmacao(true);
        return;
      }

      try {
        await registerMutation.mutateAsync({
          nome: form.nome.trim(),
          cpf: form.cpf,
          dataNascimento: form.dataNascimento,
          telefone: form.telefone.trim(),
          convenio: form.convenio.trim() || undefined,
        });
      } catch (mutationError) {
        if (mutationError instanceof TRPCClientError) {
          const code = (mutationError as TRPCClientError<AppRouter>).data
            ?.code;
          if (code === "CONFLICT") {
            toast.error("CPF ou e-mail já cadastrado.");
          } else if (code === "UNAUTHORIZED") {
            toast.error("Sessão inválida. Tente entrar novamente.");
          } else {
            toast.error("Não foi possível concluir o cadastro. Tente novamente.");
          }
        } else {
          toast.error("Não foi possível concluir o cadastro. Tente novamente.");
        }
        return;
      }

      router.push("/paciente/triagem");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (aguardandoConfirmacao) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cadastro iniciado!</CardTitle>
          <CardDescription>
            Confira seu e-mail para confirmar a conta antes de continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Enviamos um link de confirmação para{" "}
            <span className="font-medium text-foreground">{form.email}</span>.
            Depois de confirmar, volte aqui e faça login para concluir seu
            cadastro de paciente.
          </p>
          <Link href="/login" className={cn(buttonVariants(), "mt-4 w-full")}>
            Ir para o login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>
          Cadastre-se para realizar sua pré-triagem remota.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              name="nome"
              autoComplete="name"
              value={form.nome}
              onChange={(event) => updateField("nome", event.target.value)}
              aria-invalid={Boolean(errors.nome)}
              required
            />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              aria-invalid={Boolean(errors.email)}
              required
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                name="senha"
                type="password"
                autoComplete="new-password"
                value={form.senha}
                onChange={(event) => updateField("senha", event.target.value)}
                aria-invalid={Boolean(errors.senha)}
                required
              />
              {errors.senha && (
                <p className="text-xs text-destructive">{errors.senha}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmarSenha">Confirmar senha</Label>
              <Input
                id="confirmarSenha"
                name="confirmarSenha"
                type="password"
                autoComplete="new-password"
                value={form.confirmarSenha}
                onChange={(event) =>
                  updateField("confirmarSenha", event.target.value)
                }
                aria-invalid={Boolean(errors.confirmarSenha)}
                required
              />
              {errors.confirmarSenha && (
                <p className="text-xs text-destructive">
                  {errors.confirmarSenha}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              name="cpf"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(event) => updateField("cpf", event.target.value)}
              aria-invalid={Boolean(errors.cpf)}
              required
            />
            {errors.cpf && (
              <p className="text-xs text-destructive">{errors.cpf}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dataNascimento">Data de nascimento</Label>
              <Input
                id="dataNascimento"
                name="dataNascimento"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={form.dataNascimento}
                onChange={(event) =>
                  updateField("dataNascimento", event.target.value)
                }
                aria-invalid={Boolean(errors.dataNascimento)}
                required
              />
              {errors.dataNascimento && (
                <p className="text-xs text-destructive">
                  {errors.dataNascimento}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                name="telefone"
                type="tel"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={(event) =>
                  updateField("telefone", event.target.value)
                }
                aria-invalid={Boolean(errors.telefone)}
                required
              />
              {errors.telefone && (
                <p className="text-xs text-destructive">{errors.telefone}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="convenio">
              Convênio <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="convenio"
              name="convenio"
              value={form.convenio}
              onChange={(event) => updateField("convenio", event.target.value)}
            />
          </div>

          <Button type="submit" className="mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Criar conta"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
