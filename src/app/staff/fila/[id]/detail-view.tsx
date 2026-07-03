"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";
import { ArrowLeft, UserRound } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/routers/_app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import {
  formatarDataHora,
  STATUS_INFO,
  STATUS_ORDER,
  type FilaStatus,
} from "../_lib/status";

export function DetailView({ filaEntryId }: { filaEntryId: string }) {
  const utils = trpc.useUtils();
  const query = trpc.staff.getPatientDetail.useQuery({ filaEntryId });

  const updateStatusMutation = trpc.staff.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado.");
      utils.staff.getPatientDetail.invalidate({ filaEntryId });
      utils.staff.listQueue.invalidate();
    },
    onError: () => {
      toast.error("Não foi possível atualizar o status. Tente novamente.");
    },
  });

  const addObservationMutation = trpc.staff.addObservation.useMutation({
    onSuccess: () => {
      toast.success("Observação salva.");
      utils.staff.getPatientDetail.invalidate({ filaEntryId });
      utils.staff.listQueue.invalidate();
    },
    onError: () => {
      toast.error("Não foi possível salvar a observação. Tente novamente.");
    },
  });

  const [observacao, setObservacao] = useState("");
  // Rastreia o último valor sincronizado do servidor para inicializar/atualizar
  // o textarea sem sobrescrever edições em andamento do usuário.
  const [syncedObservacao, setSyncedObservacao] = useState<string | null>(
    null,
  );

  if (
    query.data &&
    (query.data.observacoesStaff ?? "") !== (syncedObservacao ?? "")
  ) {
    const valorServidor = query.data.observacoesStaff ?? "";
    setSyncedObservacao(valorServidor);
    setObservacao(valorServidor);
  }

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (query.error || !query.data) {
    const notFound =
      query.error instanceof TRPCClientError &&
      (query.error as TRPCClientError<AppRouter>).data?.code === "NOT_FOUND";

    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <UserRound className="size-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {notFound ? "Paciente não encontrado" : "Erro ao carregar dados"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {notFound
              ? "Este registro não existe ou não pertence ao seu hospital."
              : "Não foi possível carregar os dados deste paciente."}
          </p>
        </div>
        <Button render={<Link href="/staff/fila" />} variant="outline">
          <ArrowLeft data-icon="inline-start" />
          Voltar para a fila
        </Button>
      </div>
    );
  }

  const entry = query.data;
  const status = entry.status as FilaStatus;
  const statusInfo = STATUS_INFO[status];
  const preTriagem = entry.preTriagem;

  function handleStatusChange(value: FilaStatus | null) {
    if (!value || value === status) return;
    updateStatusMutation.mutate({
      filaEntryId,
      status: value,
    });
  }

  function handleSalvarObservacao() {
    addObservationMutation.mutate({
      filaEntryId,
      observacoesStaff: observacao,
    });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button render={<Link href="/staff/fila" />} variant="ghost" size="icon-sm">
          <ArrowLeft />
          <span className="sr-only">Voltar</span>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {entry.paciente.user.nome}
          </h1>
          <p className="text-sm text-muted-foreground">
            {entry.paciente.user.email}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Status do atendimento</CardTitle>
              <CardDescription>
                Entrada na fila em {formatarDataHora(entry.createdAt)}
              </CardDescription>
            </div>
            <Badge className={statusInfo.badgeClass}>{statusInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">
              Alterar status
            </span>
            <Select
              value={status}
              onValueChange={handleStatusChange}
              disabled={updateStatusMutation.isPending}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((option) => (
                  <SelectItem key={option} value={option}>
                    {STATUS_INFO[option].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {entry.updatedByUser && (
            <p className="mt-4 text-xs text-muted-foreground">
              Última atualização por {entry.updatedByUser.nome} em{" "}
              {formatarDataHora(entry.updatedAt)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pré-triagem</CardTitle>
          <CardDescription>
            Enviada em {formatarDataHora(preTriagem.createdAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <p className="font-medium text-foreground">Queixa principal</p>
              <p className="text-muted-foreground">
                {preTriagem.queixaPrincipal}
              </p>
            </div>

            <Separator />

            <div>
              <p className="font-medium text-foreground">Sintomas</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {preTriagem.sintomas.length > 0 ? (
                  preTriagem.sintomas.map((sintoma) => (
                    <Badge key={sintoma} variant="secondary">
                      {sintoma}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">
                    Nenhum sintoma informado.
                  </span>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="font-medium text-foreground">
                  Duração dos sintomas
                </p>
                <p className="text-muted-foreground">
                  {preTriagem.duracaoSintomas ?? "Não informado"}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Intensidade da dor
                </p>
                <p className="text-muted-foreground">
                  {preTriagem.nivelDor != null
                    ? `${preTriagem.nivelDor}/10`
                    : "Não informado"}
                </p>
              </div>
            </div>

            {preTriagem.descricaoLivre && (
              <>
                <Separator />
                <div>
                  <p className="font-medium text-foreground">
                    Descrição adicional
                  </p>
                  <p className="text-muted-foreground">
                    {preTriagem.descricaoLivre}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações da equipe</CardTitle>
          <CardDescription>
            Visível apenas para a equipe do hospital.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Textarea
              value={observacao}
              onChange={(event) => setObservacao(event.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Adicione observações sobre o atendimento deste paciente..."
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {observacao.length}/2000
              </span>
              <Button
                size="sm"
                onClick={handleSalvarObservacao}
                disabled={addObservationMutation.isPending}
              >
                {addObservationMutation.isPending
                  ? "Salvando..."
                  : "Salvar observação"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
