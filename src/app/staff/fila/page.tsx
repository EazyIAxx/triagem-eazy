"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatarDataHora,
  formatarDuracao,
  STATUS_INFO,
  type FilaListEntry,
  type FilaStatus,
} from "./_lib/status";

type TabValue = "ativos" | "FINALIZADO" | "CANCELADO";

const TABS: { value: TabValue; label: string }[] = [
  { value: "ativos", label: "Ativos" },
  { value: "FINALIZADO", label: "Finalizados" },
  { value: "CANCELADO", label: "Cancelados" },
];

export default function StaffFilaPage() {
  const [tab, setTab] = useState<TabValue>("ativos");

  const { data, isLoading } = trpc.staff.listQueue.useQuery(
    tab === "ativos" ? undefined : { status: tab },
    { refetchInterval: 10000 },
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Fila de atendimento
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe e gerencie os pacientes em pré-triagem do seu hospital.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as TabValue)}
      >
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab}>
          <QueueTable entries={data} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QueueTable({
  entries,
  isLoading,
}: {
  entries: FilaListEntry[] | undefined;
  isLoading: boolean;
}) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="mt-4 flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <ClipboardList className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Nenhum paciente na fila.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Paciente</TableHead>
            <TableHead>Queixa principal</TableHead>
            <TableHead>Entrada</TableHead>
            <TableHead>Espera</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const status = entry.status as FilaStatus;
            const info = STATUS_INFO[status];
            const encerrado =
              status === "FINALIZADO" || status === "CANCELADO";
            const fimEspera = encerrado
              ? (entry.finalizadoEm ?? entry.updatedAt)
              : undefined;

            function irParaDetalhe() {
              router.push(`/staff/fila/${entry.id}`);
            }

            return (
              <TableRow
                key={entry.id}
                role="link"
                tabIndex={0}
                onClick={irParaDetalhe}
                onKeyDown={(event) => {
                  if (event.key === "Enter") irParaDetalhe();
                }}
                className="cursor-pointer"
              >
                <TableCell className="font-medium text-foreground">
                  {entry.paciente.user.nome}
                </TableCell>
                <TableCell
                  className="max-w-[280px] truncate"
                  title={entry.preTriagem.queixaPrincipal}
                >
                  {entry.preTriagem.queixaPrincipal}
                </TableCell>
                <TableCell>{formatarDataHora(entry.createdAt)}</TableCell>
                <TableCell>
                  {formatarDuracao(entry.createdAt, fimEspera)}
                </TableCell>
                <TableCell>
                  <Badge className={info.badgeClass}>{info.label}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
