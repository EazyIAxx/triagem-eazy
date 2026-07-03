import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { StaffShell } from "@/components/layouts/staff-shell";

export default async function StaffLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "PROFISSIONAL" && user.role !== "ADMIN")) {
    redirect("/login");
  }

  return (
    <StaffShell nome={user.nome} isAdmin={user.role === "ADMIN"}>
      {children}
    </StaffShell>
  );
}
