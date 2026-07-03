import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PatientShell } from "@/components/layouts/patient-shell";

export default async function PatientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user || user.role !== "PACIENTE") {
    redirect("/login");
  }

  return <PatientShell nome={user.nome}>{children}</PatientShell>;
}
