import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Link
          href="/"
          className="flex flex-col items-center gap-1 text-center"
        >
          <span className="text-xl font-semibold text-foreground">
            Triagem Eazy
          </span>
          <span className="text-sm text-muted-foreground">
            Cadastro e pré-triagem remota para pacientes de baixa urgência
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
