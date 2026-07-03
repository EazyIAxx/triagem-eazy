import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClipboardCheck, Clock, ShieldCheck, Smartphone } from "lucide-react";

const passos = [
  {
    numero: "1",
    titulo: "Cadastre-se e faça a pré-triagem em casa",
    descricao:
      "Preencha seus dados e responda a um questionário rápido de sintomas antes de sair de casa.",
    icon: Smartphone,
  },
  {
    numero: "2",
    titulo: "Acompanhe sua posição na fila",
    descricao:
      "Veja em tempo real quantas pessoas estão à sua frente e a estimativa de tempo de espera.",
    icon: Clock,
  },
  {
    numero: "3",
    titulo: "Seja notificado na hora certa",
    descricao:
      "Você recebe um aviso para se deslocar até o hospital só quando estiver perto de ser atendido.",
    icon: ShieldCheck,
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold text-foreground">
            Triagem Eazy
          </span>
          <nav className="flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Entrar
            </Link>
            <Link href="/registro" className={buttonVariants({ size: "sm" })}>
              Cadastre-se
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ClipboardCheck className="size-3.5" aria-hidden="true" />
            Pré-triagem remota para casos de baixa urgência
          </span>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
            Faça seu cadastro e sua triagem sem sair de casa
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground text-balance">
            Pacientes de baixa urgência podem se cadastrar e realizar a
            pré-triagem remotamente, acompanhar a posição na fila em tempo
            real e ser avisados exatamente na hora de se deslocar até o
            hospital &mdash; evitando esperas desnecessárias na recepção.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/registro" className={cn(buttonVariants({ size: "lg" }), "px-6")}>
              Começar meu cadastro
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-6")}
            >
              Já tenho conta
            </Link>
          </div>
        </section>

        <section className="border-t border-border bg-card/50 py-16">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Como funciona
              </h2>
              <p className="mt-2 text-muted-foreground">
                Três passos simples entre você e um atendimento mais rápido.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {passos.map((passo) => (
                <Card key={passo.numero}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {passo.numero}
                      </span>
                      <passo.icon
                        className="size-5 text-primary"
                        aria-hidden="true"
                      />
                    </div>
                    <CardTitle className="mt-2">{passo.titulo}</CardTitle>
                    <CardDescription>{passo.descricao}</CardDescription>
                  </CardHeader>
                  <CardContent />
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Menos espera no hospital, mais previsibilidade para você
            </h2>
            <p className="max-w-xl text-muted-foreground">
              Cadastre-se agora e leve sua pré-triagem para o hospital antes
              mesmo de sair de casa.
            </p>
            <Link href="/registro" className={cn(buttonVariants({ size: "lg" }), "px-6")}>
              Cadastre-se gratuitamente
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto w-full max-w-6xl px-6 text-center text-sm text-muted-foreground">
          Triagem Eazy &mdash; cadastro e pré-triagem remota para pacientes de
          baixa urgência.
        </div>
      </footer>
    </div>
  );
}
