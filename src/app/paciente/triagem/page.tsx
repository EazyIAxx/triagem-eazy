"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";
import { Check } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/routers/_app";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type FormState = {
  queixaPrincipal: string;
  duracaoSintomas: string | undefined;
  sintomas: string[];
  descricaoLivre: string;
  nivelDor: number | undefined;
};

type FormErrors = {
  queixaPrincipal?: string;
  sintomas?: string;
};

const initialState: FormState = {
  queixaPrincipal: "",
  duracaoSintomas: undefined,
  sintomas: [],
  descricaoLivre: "",
  nivelDor: undefined,
};

const DURACAO_OPCOES = [
  "Menos de 1 dia",
  "1-2 dias",
  "3-7 dias",
  "Mais de 1 semana",
];

const SINTOMAS_OPCOES = [
  "Febre",
  "Dor de cabeça",
  "Dor de garganta",
  "Tosse",
  "Náusea",
  "Dor abdominal",
  "Tontura",
  "Falta de ar",
  "Dor no corpo",
  "Outros",
];

const STEPS = [
  { id: 1, label: "Queixa" },
  { id: 2, label: "Sintomas" },
  { id: 3, label: "Dor" },
  { id: 4, label: "Revisão" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const STEP_INFO: Record<StepId, { title: string; description: string }> = {
  1: {
    title: "Queixa principal",
    description: "Conte o que está sentindo para começarmos.",
  },
  2: {
    title: "Sintomas",
    description: "Selecione tudo o que se aplica a você.",
  },
  3: {
    title: "Intensidade da dor",
    description: "0 = sem dor, 10 = pior dor possível.",
  },
  4: {
    title: "Revisão",
    description: "Confira os dados antes de enviar sua pré-triagem.",
  },
};

function nivelDorLabel(nivel: number) {
  if (nivel === 0) return "Sem dor";
  if (nivel <= 3) return "Dor leve";
  if (nivel <= 6) return "Dor moderada";
  return "Dor intensa";
}

function nivelDorClasses(nivel: number, selecionado: boolean) {
  if (!selecionado) {
    return "border-border bg-muted text-foreground hover:bg-muted/70";
  }
  if (nivel <= 3) return "border-transparent bg-success text-success-foreground";
  if (nivel <= 6) return "border-transparent bg-warning text-warning-foreground";
  return "border-transparent bg-destructive text-white";
}

export default function TriagemPage() {
  const router = useRouter();
  const submitMutation = trpc.triage.submit.useMutation();
  const [step, setStep] = useState<StepId>(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleSintoma(sintoma: string) {
    setForm((prev) => ({
      ...prev,
      sintomas: prev.sintomas.includes(sintoma)
        ? prev.sintomas.filter((item) => item !== sintoma)
        : [...prev.sintomas, sintoma],
    }));
    setErrors((prev) => (prev.sintomas ? { ...prev, sintomas: undefined } : prev));
  }

  function validarStep1(): string | undefined {
    const texto = form.queixaPrincipal.trim();
    if (texto.length < 3) {
      return "Descreva o motivo da consulta (mínimo 3 caracteres).";
    }
    if (texto.length > 500) {
      return "A descrição deve ter no máximo 500 caracteres.";
    }
    return undefined;
  }

  function validarStep2(): string | undefined {
    if (form.sintomas.length === 0) {
      return "Selecione pelo menos um sintoma.";
    }
    return undefined;
  }

  function handleAvancar() {
    if (step === 1) {
      const erro = validarStep1();
      setErrors((prev) => ({ ...prev, queixaPrincipal: erro }));
      if (erro) return;
    }
    if (step === 2) {
      const erro = validarStep2();
      setErrors((prev) => ({ ...prev, sintomas: erro }));
      if (erro) return;
    }
    setStep((prev) => (prev < 4 ? ((prev + 1) as StepId) : prev));
  }

  function handleVoltar() {
    setStep((prev) => (prev > 1 ? ((prev - 1) as StepId) : prev));
  }

  async function handleEnviar() {
    try {
      await submitMutation.mutateAsync({
        queixaPrincipal: form.queixaPrincipal.trim(),
        sintomas: form.sintomas,
        descricaoLivre: form.descricaoLivre.trim() || undefined,
        duracaoSintomas: form.duracaoSintomas,
        nivelDor: form.nivelDor,
      });
      toast.success("Pré-triagem enviada!");
      router.push("/paciente/fila");
    } catch (error) {
      if (error instanceof TRPCClientError) {
        const code = (error as TRPCClientError<AppRouter>).data?.code;
        if (code === "CONFLICT") {
          toast.error(error.message);
          router.push("/paciente/fila");
          return;
        }
        if (code === "PRECONDITION_FAILED") {
          toast.error(error.message);
          return;
        }
      }
      toast.error("Não foi possível enviar a pré-triagem. Tente novamente.");
    }
  }

  const info = STEP_INFO[step];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Pré-triagem
        </h1>
        <p className="text-sm text-muted-foreground">
          Responda algumas perguntas rápidas para agilizar seu atendimento.
        </p>
      </div>

      <StepIndicator step={step} />

      <Card>
        <CardHeader>
          <CardTitle>{info.title}</CardTitle>
          <CardDescription>{info.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="queixaPrincipal">
                  Qual o principal motivo da sua consulta hoje?
                </Label>
                <Textarea
                  id="queixaPrincipal"
                  value={form.queixaPrincipal}
                  onChange={(event) => {
                    updateField("queixaPrincipal", event.target.value);
                    if (errors.queixaPrincipal) {
                      setErrors((prev) => ({
                        ...prev,
                        queixaPrincipal: undefined,
                      }));
                    }
                  }}
                  maxLength={500}
                  rows={4}
                  aria-invalid={Boolean(errors.queixaPrincipal)}
                  placeholder="Descreva o que está sentindo..."
                  required
                />
                <div className="flex items-center justify-between">
                  {errors.queixaPrincipal ? (
                    <p className="text-xs text-destructive">
                      {errors.queixaPrincipal}
                    </p>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {form.queixaPrincipal.length}/500
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="duracaoSintomas">
                  Há quanto tempo você sente isso?{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Select
                  value={form.duracaoSintomas}
                  onValueChange={(value) =>
                    updateField("duracaoSintomas", value ?? undefined)
                  }
                >
                  <SelectTrigger id="duracaoSintomas" className="w-full">
                    <SelectValue placeholder="Selecione a duração" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURACAO_OPCOES.map((opcao) => (
                      <SelectItem key={opcao} value={opcao}>
                        {opcao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label>Quais sintomas você está sentindo?</Label>
                <div className="flex flex-wrap gap-2">
                  {SINTOMAS_OPCOES.map((sintoma) => {
                    const selecionado = form.sintomas.includes(sintoma);
                    return (
                      <button
                        key={sintoma}
                        type="button"
                        onClick={() => toggleSintoma(sintoma)}
                        aria-pressed={selecionado}
                        className={cn(
                          "min-h-6 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                          selecionado
                            ? "border-transparent bg-primary text-primary-foreground"
                            : "border-border bg-muted text-foreground hover:bg-muted/70",
                        )}
                      >
                        {sintoma}
                      </button>
                    );
                  })}
                </div>
                {errors.sintomas && (
                  <p className="text-xs text-destructive">{errors.sintomas}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="descricaoLivre">
                  Descrição adicional{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="descricaoLivre"
                  value={form.descricaoLivre}
                  onChange={(event) =>
                    updateField("descricaoLivre", event.target.value)
                  }
                  maxLength={1000}
                  rows={3}
                  placeholder="Conte mais detalhes, se quiser..."
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3">
              <Label>Em uma escala de 0 a 10, qual sua dor agora?</Label>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 11 }, (_, nivel) => nivel).map(
                  (nivel) => {
                    const selecionado = form.nivelDor === nivel;
                    return (
                      <button
                        key={nivel}
                        type="button"
                        onClick={() =>
                          updateField("nivelDor", selecionado ? undefined : nivel)
                        }
                        aria-pressed={selecionado}
                        className={cn(
                          "flex size-9 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                          nivelDorClasses(nivel, selecionado),
                        )}
                      >
                        {nivel}
                      </button>
                    );
                  },
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {form.nivelDor !== undefined
                  ? `Nível ${form.nivelDor} — ${nivelDorLabel(form.nivelDor)}`
                  : "Toque em um número para informar (opcional)."}
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4 text-sm">
              <div>
                <p className="font-medium text-foreground">
                  Queixa principal
                </p>
                <p className="text-muted-foreground">
                  {form.queixaPrincipal}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Duração dos sintomas
                </p>
                <p className="text-muted-foreground">
                  {form.duracaoSintomas ?? "Não informado"}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Sintomas</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {form.sintomas.map((sintoma) => (
                    <Badge key={sintoma} variant="secondary">
                      {sintoma}
                    </Badge>
                  ))}
                </div>
              </div>
              {form.descricaoLivre.trim() && (
                <div>
                  <p className="font-medium text-foreground">
                    Descrição adicional
                  </p>
                  <p className="text-muted-foreground">
                    {form.descricaoLivre}
                  </p>
                </div>
              )}
              <div>
                <p className="font-medium text-foreground">
                  Intensidade da dor
                </p>
                <p className="text-muted-foreground">
                  {form.nivelDor !== undefined
                    ? `${form.nivelDor} — ${nivelDorLabel(form.nivelDor)}`
                    : "Não informado"}
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleVoltar}
                disabled={submitMutation.isPending}
              >
                Voltar
              </Button>
            ) : (
              <span />
            )}
            {step < 4 ? (
              <Button type="button" onClick={handleAvancar}>
                Próximo
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleEnviar}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending
                  ? "Enviando..."
                  : "Enviar pré-triagem"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StepIndicator({ step }: { step: StepId }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, index) => (
        <div key={s.id} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-full border text-sm font-medium",
                step === s.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : step > s.id
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground",
              )}
            >
              {step > s.id ? <Check className="size-4" /> : s.id}
            </div>
            <span
              className={cn(
                "text-xs whitespace-nowrap",
                step === s.id
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={cn(
                "mx-2 h-px flex-1",
                step > s.id ? "bg-primary/40" : "bg-border",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
