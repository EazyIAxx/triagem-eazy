"use client";

import Link from "next/link";
import {
  Activity,
  Bell,
  CheckCircle2,
  ClipboardList,
  Hourglass,
  Users,
  XCircle,
} from "lucide-react";
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
import {
  formatarDataHora,
  formatElapsed,
  useElapsedSeconds,
} from "./fila-helpers";

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

const TIMELINE_STEPS = [
  { key: "EM_ANALISE", label: "Em análise", icon: ClipboardList },
  { key: "CHAMADO", label: "Chamado", icon: Bell },
  { key: "EM_ATENDIMENTO", label: "Em atendimento", icon: Activity },
  { key: "FINALIZADO", label: "Finalizado", icon: CheckCircle2 },
] as const;

/** Índice (0-3) do passo atual na timeline. -1 quando não se aplica (cancelado). */
function statusStepIndex(status: FilaStatus): number {
  switch (status) {
    case "EM_ANALISE":
      return 0;
    case "CHAMADO":
      return 1;
    case "EM_ATENDIMENTO":
      return 2;
    case "FINALIZADO":
      return 3;
    default:
      return -1;
  }
}

/** Timeline horizontal com as 4 etapas do atendimento (não usada para CANCELADO). */
function AtendimentoTimeline({ status }: { status: FilaStatus }) {
  const currentIndex = statusStepIndex(status);

  return (
    <div
      role="list"
      aria-label="Etapas do atendimento"
      className="flex items-start"
    >
      {TIMELINE_STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === TIMELINE_STEPS.length - 1;
        const Icon = isDone ? CheckCircle2 : step.icon;

        return (
          <div
            key={step.key}
            role="listitem"
            className={cn("flex items-start", !isLast && "flex-1")}
          >
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isDone && "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary bg-primary/10 text-primary",
                  !isDone && !isCurrent && "border-border bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </div>
              <span
                className={cn(
                  "max-w-16 text-center text-[11px] leading-tight",
                  isDone || isCurrent
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                aria-hidden="true"
                className={cn(
                  "mx-1 mt-4 h-0.5 flex-1 rounded-full transition-colors",
                  index < currentIndex ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Anel de progresso (SVG puro) mostrando o quanto do tempo estimado de
 * espera já se passou. Preenchimento e trilha usam a mesma cor (primary),
 * apenas com opacidades diferentes — nunca cores distintas.
 */
function WaitProgressRing({
  progress,
  timerLabel,
}: {
  progress: number;
  timerLabel: string;
}) {
  const size = 132;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const dashOffset = circumference * (1 - clamped);

  return (
    <div className="relative flex size-[132px] shrink-0 items-center justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="size-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          stroke="currentColor"
          className="text-primary/15"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="text-primary transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className="tabular-nums text-2xl font-medium text-foreground">
          {timerLabel}
        </span>
        <span className="text-[11px] text-muted-foreground">
          tempo decorrido
        </span>
      </div>
      <span className="sr-only">
        Progresso estimado da espera: {Math.round(clamped * 100)}%
      </span>
    </div>
  );
}

export default function FilaPage() {
  const { data, isLoading } = trpc.queue.getMyPosition.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const elapsedSeconds = useElapsedSeconds(data?.criadoEm ?? null);

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
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
          <ClipboardList className="size-7 text-primary" />
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

  const etaSeconds = data.etaMinutos * 60;
  const progress =
    status === "CHAMADO" ? 1 : etaSeconds > 0 ? elapsedSeconds / etaSeconds : 0;
  const remainingMinutes = Math.max(
    Math.round(data.etaMinutos - elapsedSeconds / 60),
    0,
  );

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
        <CardContent className="flex flex-col gap-6">
          {status !== "CANCELADO" && <AtendimentoTimeline status={status} />}

          {!encerrado && (
            <div className="flex flex-col items-center gap-6 rounded-xl bg-muted/40 p-4 sm:flex-row sm:p-6">
              <WaitProgressRing
                progress={progress}
                timerLabel={formatElapsed(elapsedSeconds)}
              />

              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-lg bg-card p-3 ring-1 ring-border">
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
                <div className="flex items-start gap-3 rounded-lg bg-card p-3 ring-1 ring-border">
                  <Hourglass className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Estimativa de espera
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      ~{data.etaMinutos} min
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {status === "CHAMADO"
                        ? "Tempo estimado já atingido"
                        : `cerca de ${remainingMinutes} min restantes`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">
              Queixa principal
            </p>
            <p className="text-sm text-muted-foreground">
              {data.queixaPrincipal}
            </p>
          </div>

          {data.chamadoEm && (
            <p className="text-xs text-muted-foreground">
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
