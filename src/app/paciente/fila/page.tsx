"use client";

import Link from "next/link";
import { Bell, Clock, ClipboardList, Users, CheckCircle2, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FilaStatus =
  | "EM_ANALISE"
  | "CHAMADO"
  | "EM_ATENDIMENTO"
  | "FINALIZADO"
  | "CANCELADO";

const STATUS_INFO: Record<FilaStatus, { label: string; badgeClass: string }> = {
  EM_ANALISE: {
    label: "Em análise",
    badgeClass: "border-transparent bg-muted text-foreground",
  },
  CHAMADO: {
    label: "Chamado",
    badgeClass: "border-transparent bg-warning text-warning-foreground",
  },
  EM_ATENDIMENTO: {
    label: "Em atendimento",
    badgeClass: "border-transparent bg-primary text-primary-foreground",
  },
  FINALIZADO: {
    label: "Finalizado",
    badgeClass: "border-transparent bg-success text-success-foreground",
  },
  CANCELADO: {
    label: "Cancelado",
    badgeClass: "border-transparent bg-destructive text-white",
  },
};

function formatarDataHora(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

export default function FilaPage() {
  const { data, isLoading } = trpc.queue.getMyPosition.useQuery(undefined, {
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <ClipboardList className="size-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Nenhuma pré-triagem em andamento
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Você ainda não tem uma pré-triagem em andamento.
          </p>
        </div>
        <Button render={<Link href="/paciente/triagem" />}>
          Iniciar pré-triagem
        </Button>
      </div>
    );
  }

  const status = data.status as FilaStatus;
  const info = STATUS_INFO[status];
  const encerrado = status === "FINALIZADO" || status === "CANCELADO";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Sua fila de atendimento
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe aqui sua posição e o status do seu atendimento.
        </p>
      </div>

      {status === "CHAMADO" && (
        <div className="flex items-center gap-3 rounded-xl bg-warning px-4 py-4 text-warning-foreground ring-1 ring-warning/30 sm:px-6">
          <Bell className="size-6 shrink-0" />
          <div>
            <p className="font-semibold">Hora de ir ao hospital!</p>
            <p className="text-sm">
              Sua triagem foi chamada. Dirija-se à unidade de saúde o quanto
              antes.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Status do atendimento</CardTitle>
            <Badge className={info.badgeClass}>{info.label}</Badge>
          </div>
          <CardDescription>
            Enviado em {formatarDataHora(data.criadoEm)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!encerrado && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                <Users className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Posição na fila
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {data.posicao === 1
                      ? "Você é o próximo!"
                      : `Nº ${data.posicao}`}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Estimativa de espera
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    ~{data.etaMinutos} min
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">
              Queixa principal
            </p>
            <p className="text-sm text-muted-foreground">
              {data.queixaPrincipal}
            </p>
          </div>

          {data.chamadoEm && (
            <p className="mt-4 text-xs text-muted-foreground">
              Chamado em {formatarDataHora(data.chamadoEm)}
            </p>
          )}
        </CardContent>
      </Card>

      {encerrado && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border p-4",
            status === "FINALIZADO"
              ? "border-success/30 bg-success/10"
              : "border-destructive/30 bg-destructive/10",
          )}
        >
          {status === "FINALIZADO" ? (
            <CheckCircle2 className="size-5 shrink-0 text-success" />
          ) : (
            <XCircle className="size-5 shrink-0 text-destructive" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {status === "FINALIZADO"
                ? "Atendimento encerrado."
                : "Atendimento cancelado."}
            </p>
            <p className="text-sm text-muted-foreground">
              Precisa de um novo atendimento? Inicie uma nova pré-triagem.
            </p>
          </div>
          <Button
            render={<Link href="/paciente/triagem" />}
            variant="outline"
            size="sm"
          >
            Nova pré-triagem
          </Button>
        </div>
      )}
    </div>
  );
}
