"use client";

import { useEffect, useState } from "react";

/**
 * Retorna o tempo decorrido (em segundos inteiros) desde `start`.
 *
 * Atualiza a cada segundo via `setInterval` (client-side) e recalcula
 * automaticamente sempre que o instante de início mudar — por exemplo,
 * após um refetch que traga uma pré-triagem diferente com `criadoEm`
 * distinto. Quando `start` é `null` (nenhuma pré-triagem ativa/carregando),
 * nenhum timer é iniciado e o valor retornado é `0`.
 */
function computeElapsed(startMs: number | null): number {
  return startMs === null ? 0 : Math.max(0, Math.floor((Date.now() - startMs) / 1000));
}

export function useElapsedSeconds(start: Date | null): number {
  const startMs = start ? start.getTime() : null;

  // Estado auxiliar só para detectar, durante a renderização, quando
  // `startMs` mudou (ex.: refetch trouxe uma pré-triagem diferente) e
  // recalcular o cronômetro imediatamente — sem depender de um efeito
  // (evita disparar setState de forma síncrona dentro de um efeito).
  const [trackedStartMs, setTrackedStartMs] = useState(startMs);
  const [elapsedSeconds, setElapsedSeconds] = useState(() => computeElapsed(startMs));

  if (startMs !== trackedStartMs) {
    setTrackedStartMs(startMs);
    setElapsedSeconds(computeElapsed(startMs));
  }

  useEffect(() => {
    if (startMs === null) {
      return;
    }

    const intervalId = setInterval(() => {
      setElapsedSeconds(computeElapsed(startMs));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [startMs]);

  return elapsedSeconds;
}

/** Formata segundos totais como `mm:ss`, ou `hh:mm:ss` a partir de 60 minutos. */
export function formatElapsed(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function formatarDataHora(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}
