"use client";

import type { ComponentType } from "react";
import { Users, Clock, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPage() {
  const { data, isLoading } = trpc.admin.getMetrics.useQuery(undefined, {
    refetchInterval: 15000,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Painel administrativo
        </h1>
        {isLoading ? (
          <Skeleton className="mt-1.5 h-4 w-48" />
        ) : (
          <p className="text-sm text-muted-foreground">
            {data?.hospital.nome}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          icon={Users}
          label="Pacientes na fila"
          value={data?.pacientesNaFila}
          isLoading={isLoading}
        />
        <MetricCard
          icon={Clock}
          label="Tempo médio de atendimento"
          value={data ? `${data.tempoMedioEsperaMin} min` : undefined}
          isLoading={isLoading}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Atendimentos hoje"
          value={data?.atendimentosHoje}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  isLoading,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number | undefined;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Icon className="size-4 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-9 w-20" />
        ) : (
          <p className="text-3xl font-semibold text-foreground">
            {value ?? "—"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
