"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminConfiguracoesPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.getMetrics.useQuery();

  const [nome, setNome] = useState("");
  const [tempoMedioAtendimentoMin, setTempoMedioAtendimentoMin] =
    useState("");
  const [nomeSincronizado, setNomeSincronizado] = useState<string | null>(
    null,
  );

  // Inicializa/atualiza o campo "nome" com o valor do servidor sem
  // sobrescrever edições em andamento do usuário (mesmo padrão usado em
  // src/app/staff/fila/[id]/detail-view.tsx).
  if (data && data.hospital.nome !== nomeSincronizado) {
    setNome(data.hospital.nome);
    setNomeSincronizado(data.hospital.nome);
  }

  const updateMutation = trpc.admin.updateHospitalConfig.useMutation({
    onSuccess: () => {
      toast.success("Configurações atualizadas.");
      utils.admin.getMetrics.invalidate();
      setTempoMedioAtendimentoMin("");
    },
    onError: (error) => {
      if (error.data?.code === "BAD_REQUEST") {
        toast.error(error.message);
      } else {
        toast.error(
          "Não foi possível atualizar as configurações. Tente novamente.",
        );
      }
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input: {
      nome?: string;
      tempoMedioAtendimentoMin?: number;
    } = {};

    const nomeTrim = nome.trim();
    if (nomeTrim && nomeTrim !== data?.hospital.nome) {
      input.nome = nomeTrim;
    }

    const tempoTrim = tempoMedioAtendimentoMin.trim();
    if (tempoTrim) {
      const tempoNumero = Number(tempoTrim);
      if (Number.isFinite(tempoNumero)) {
        input.tempoMedioAtendimentoMin = Math.round(tempoNumero);
      }
    }

    if (Object.keys(input).length === 0) {
      toast.error("Altere ao menos um campo para salvar.");
      return;
    }

    updateMutation.mutate(input);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Configurações do hospital
        </h1>
        <p className="text-sm text-muted-foreground">
          Ajuste as informações gerais da sua unidade.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Dados gerais</CardTitle>
          <CardDescription>
            Essas informações são usadas em toda a plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
              noValidate
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hospital-nome">Nome do hospital</Label>
                <Input
                  id="hospital-nome"
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  minLength={2}
                  maxLength={200}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tempo-medio">
                  Tempo médio de atendimento (min)
                </Label>
                <Input
                  id="tempo-medio"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={600}
                  placeholder="ex: 20"
                  value={tempoMedioAtendimentoMin}
                  onChange={(event) =>
                    setTempoMedioAtendimentoMin(event.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Usado como estimativa quando ainda não há dados suficientes
                  de atendimentos recentes.
                </p>
              </div>

              <Button
                type="submit"
                className="mt-2 w-fit"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
