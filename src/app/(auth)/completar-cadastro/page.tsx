"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/routers/_app";
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

type FormState = {
  nome: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  convenio: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialState: FormState = {
  nome: "",
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
  if (form.cpf.replace(/\D/g, "").length !== 11) {
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

/**
 * Perfil de paciente que confirmou o e-mail e voltou para fazer login sem
 * nunca ter concluído `patient.register` (a sessão do Supabase já existe,
 * só falta a linha em `usuarios`/`pacientes`). O login-form redireciona
 * para cá quando `auth.me` volta nulo após um login bem-sucedido.
 */
export default function CompletarCadastroPage() {
  const router = useRouter();
  const meQuery = trpc.auth.me.useQuery();
  const registerMutation = trpc.patient.register.useMutation();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (meQuery.isLoading) return;
    if (meQuery.data) {
      router.replace("/paciente/fila");
    }
  }, [meQuery.isLoading, meQuery.data, router]);

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
      await registerMutation.mutateAsync({
        nome: form.nome.trim(),
        cpf: form.cpf,
        dataNascimento: form.dataNascimento,
        telefone: form.telefone.trim(),
        convenio: form.convenio.trim() || undefined,
      });
      router.push("/paciente/triagem");
    } catch (mutationError) {
      if (mutationError instanceof TRPCClientError) {
        const code = (mutationError as TRPCClientError<AppRouter>).data?.code;
        if (code === "UNAUTHORIZED") {
          toast.error("Sua sessão expirou. Faça login novamente.");
          router.push("/login");
          return;
        }
        if (code === "CONFLICT") {
          router.replace("/paciente/fila");
          return;
        }
      }
      toast.error("Não foi possível concluir o cadastro. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (meQuery.isLoading || meQuery.data) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Finalize seu cadastro</CardTitle>
        <CardDescription>
          Sua conta já foi confirmada. Complete seus dados para continuar.
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
            {isSubmitting ? "Enviando..." : "Concluir cadastro"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
