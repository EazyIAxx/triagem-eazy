import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers/_app";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type FilaListEntry = RouterOutputs["staff"]["listQueue"][number];
export type FilaDetailEntry = RouterOutputs["staff"]["getPatientDetail"];

export type FilaStatus =
  | "EM_ANALISE"
  | "CHAMADO"
  | "EM_ATENDIMENTO"
  | "FINALIZADO"
  | "CANCELADO";

export const STATUS_INFO: Record<
  FilaStatus,
  { label: string; badgeClass: string }
> = {
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

export const STATUS_ORDER: FilaStatus[] = [
  "EM_ANALISE",
  "CHAMADO",
  "EM_ATENDIMENTO",
  "FINALIZADO",
  "CANCELADO",
];

export function formatarDataHora(data: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

/** Duração entre `inicio` e `fim` (ou agora, se `fim` não for informado). */
export function formatarDuracao(
  inicio: Date | string,
  fim?: Date | string | null,
) {
  const inicioMs = new Date(inicio).getTime();
  const fimMs = fim ? new Date(fim).getTime() : Date.now();
  const diffMin = Math.max(0, Math.round((fimMs - inicioMs) / 60000));

  if (diffMin < 60) return `${diffMin} min`;

  const horas = Math.floor(diffMin / 60);
  const minutos = diffMin % 60;
  return minutos > 0 ? `${horas}h ${minutos}min` : `${horas}h`;
}
