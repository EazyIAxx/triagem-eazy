"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { MoreVertical, UserPlus, Users as UsersIcon } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/routers/_app";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type AdminUser = RouterOutputs["admin"]["listUsers"][number];
type Role = AdminUser["role"];
type InvitableRole = "PROFISSIONAL" | "ADMIN";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  PROFISSIONAL: "Profissional",
  PACIENTE: "Paciente",
};

const ROLE_BADGE_VARIANT: Record<Role, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  PROFISSIONAL: "secondary",
  PACIENTE: "outline",
};

const ALL_ROLES: Role[] = ["PACIENTE", "PROFISSIONAL", "ADMIN"];
const INVITABLE_ROLES: InvitableRole[] = ["PROFISSIONAL", "ADMIN"];

export default function AdminUsuariosPage() {
  const utils = trpc.useUtils();
  const { data: currentUser } = trpc.auth.me.useQuery();
  const { data: users, isLoading } = trpc.admin.listUsers.useQuery();

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Função atualizada.");
      utils.admin.listUsers.invalidate();
    },
    onError: () => {
      toast.error("Não foi possível atualizar a função. Tente novamente.");
    },
  });

  const toggleActiveMutation = trpc.admin.toggleUserActive.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado.");
      utils.admin.listUsers.invalidate();
    },
    onError: (error) => {
      if (error.data?.code === "BAD_REQUEST") {
        toast.error(error.message);
      } else {
        toast.error("Não foi possível atualizar o status. Tente novamente.");
      }
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie o acesso da equipe do seu hospital.
          </p>
        </div>
        <InviteUserDialog />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !users || users.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <UsersIcon className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Nenhum usuário cadastrado.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isSelf = user.id === currentUser?.id;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-foreground">
                      {user.nome}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_BADGE_VARIANT[user.role]}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          user.ativo
                            ? "border-transparent bg-success text-success-foreground"
                            : "border-transparent bg-muted text-muted-foreground"
                        }
                      >
                        {user.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Ações"
                            />
                          }
                        >
                          <MoreVertical />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              Alterar função
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {ALL_ROLES.map((role) => (
                                <DropdownMenuItem
                                  key={role}
                                  disabled={
                                    role === user.role ||
                                    updateRoleMutation.isPending ||
                                    (isSelf && role !== "ADMIN")
                                  }
                                  onClick={() =>
                                    updateRoleMutation.mutate({
                                      userId: user.id,
                                      role,
                                    })
                                  }
                                >
                                  {ROLE_LABELS[role]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant={user.ativo ? "destructive" : "default"}
                            disabled={isSelf || toggleActiveMutation.isPending}
                            onClick={() =>
                              toggleActiveMutation.mutate({ userId: user.id })
                            }
                          >
                            {user.ativo ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function InviteUserDialog() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [role, setRole] = useState<InvitableRole>("PROFISSIONAL");

  const createMutation = trpc.admin.createStaffUser.useMutation({
    onSuccess: () => {
      toast.success("Convite enviado.");
      utils.admin.listUsers.invalidate();
      setOpen(false);
      setEmail("");
      setNome("");
      setRole("PROFISSIONAL");
    },
    onError: (error) => {
      if (error.data?.code === "BAD_REQUEST") {
        toast.error(error.message);
      } else {
        toast.error("Não foi possível enviar o convite. Tente novamente.");
      }
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !nome.trim()) return;
    createMutation.mutate({ email: email.trim(), nome: nome.trim(), role });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) createMutation.reset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <UserPlus data-icon="inline-start" />
        Convidar novo usuário
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Convidar novo usuário</DialogTitle>
            <DialogDescription>
              Enviaremos um e-mail de convite para definição de senha.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-nome">Nome completo</Label>
            <Input
              id="invite-nome"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">Função</Label>
            <Select
              value={role}
              onValueChange={(value) =>
                value && setRole(value as InvitableRole)
              }
            >
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITABLE_ROLES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {ROLE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Enviando..." : "Enviar convite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
