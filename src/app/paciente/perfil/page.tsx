import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Meu perfil | Triagem Eazy",
};

function mascararCpf(cpf: string) {
  const digitos = cpf.replace(/\D/g, "");
  if (digitos.length !== 11) return cpf;
  return `***.***.***-${digitos.slice(-2)}`;
}

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(data);
}

export default async function PerfilPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "PACIENTE") {
    redirect("/login");
  }

  const paciente = await prisma.paciente.findUnique({
    where: { userId: user.id },
  });

  if (!paciente) {
    redirect("/completar-cadastro");
  }

  const campos = [
    { label: "Nome", valor: user.nome },
    { label: "E-mail", valor: user.email },
    { label: "CPF", valor: mascararCpf(paciente.cpf) },
    { label: "Data de nascimento", valor: formatarData(paciente.dataNascimento) },
    { label: "Telefone", valor: paciente.telefone },
    { label: "Convênio", valor: paciente.convenio ?? "Nenhum" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Meu perfil
        </h1>
        <p className="text-sm text-muted-foreground">
          Seus dados de cadastro na Triagem Eazy.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
          <CardDescription>
            Informações usadas na sua triagem e no atendimento no hospital.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col">
            {campos.map((campo, index) => (
              <div key={campo.label}>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-sm text-muted-foreground">
                    {campo.label}
                  </dt>
                  <dd className="text-sm font-medium text-foreground">
                    {campo.valor}
                  </dd>
                </div>
                {index < campos.length - 1 && <Separator />}
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
