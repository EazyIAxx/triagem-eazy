"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return `${partes[0]![0]}${partes[partes.length - 1]![0]}`.toUpperCase();
}

function formatarRelativo(data: Date) {
  const diffMs = Date.now() - new Date(data).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHoras = Math.round(diffMin / 60);
  if (diffHoras < 24) return `há ${diffHoras} h`;
  const diffDias = Math.round(diffHoras / 24);
  return `há ${diffDias} d`;
}

function NotificationBell() {
  const utils = trpc.useUtils();
  // Deriva o contador de nao lidas da propria lista (evita um round-trip
  // extra a cada poll — `list` ja traz o suficiente para o badge).
  const { data: notificacoes = [] } = trpc.notification.list.useQuery(
    undefined,
    { refetchInterval: 15000 },
  );
  const unreadCount = notificacoes.filter((n) => !n.lida).length;

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => utils.notification.list.invalidate(),
  });
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => utils.notification.list.invalidate(),
  });

  const recentes = notificacoes.slice(0, 8);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="relative"
            aria-label="Notificações"
          />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between gap-2 px-1.5 py-1">
          <DropdownMenuLabel className="p-0">Notificações</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {recentes.length === 0 ? (
          <p className="px-1.5 py-4 text-center text-sm text-muted-foreground">
            Nenhuma notificação por aqui.
          </p>
        ) : (
          recentes.map((notificacao) => (
            <DropdownMenuItem
              key={notificacao.id}
              className={cn(
                "flex-col items-start gap-0.5 py-2 whitespace-normal",
                !notificacao.lida && "bg-muted",
              )}
              onClick={() => {
                if (!notificacao.lida) {
                  markRead.mutate({ id: notificacao.id });
                }
              }}
            >
              <div className="flex w-full items-center gap-1.5">
                {!notificacao.lida && (
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                )}
                <span className="font-medium text-foreground">
                  {notificacao.titulo}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {notificacao.mensagem}
              </p>
              <span className="text-[11px] text-muted-foreground">
                {formatarRelativo(notificacao.createdAt)}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PatientShell({
  nome,
  children,
}: {
  nome: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Não foi possível sair. Tente novamente.");
        return;
      }
      router.push("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/paciente/fila" className="text-lg font-semibold text-foreground">
            Triagem Eazy
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar size="sm">
                <AvatarFallback>{iniciais(nome)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">
                {nome}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              <LogOut data-icon="inline-start" />
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
