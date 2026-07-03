import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !process.env.DATABASE_URL) {
  console.error(
    "Seed abortado: configure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e DATABASE_URL em .env " +
      "(veja .env.local.example) antes de rodar `prisma migrate dev` / `prisma db seed`.",
  );
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SEED_PASSWORD = "TriagemEazy123!";

async function ensureAuthUser(email: string) {
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
  });

  if (!error) return created.user.id;

  // Usuário já existe — busca o id existente pelo e-mail.
  const { data: list, error: listError } =
    await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw listError;

  const existing = list.users.find((u) => u.email === email);
  if (!existing) throw error;
  return existing.id;
}

async function main() {
  const hospital = await prisma.hospital.upsert({
    where: { slug: "hospital-demo" },
    create: {
      nome: "Hospital Demo Triagem Eazy",
      slug: "hospital-demo",
      tempoMedioAtendimentoMin: 20,
    },
    update: {},
  });

  const adminId = await ensureAuthUser("admin@triagemeazy.demo");
  const staffId = await ensureAuthUser("staff@triagemeazy.demo");
  const pacienteId = await ensureAuthUser("paciente@triagemeazy.demo");

  await prisma.user.upsert({
    where: { id: adminId },
    create: {
      id: adminId,
      email: "admin@triagemeazy.demo",
      nome: "Admin Demo",
      role: "ADMIN",
      hospitalId: hospital.id,
    },
    update: { role: "ADMIN", hospitalId: hospital.id },
  });

  await prisma.user.upsert({
    where: { id: staffId },
    create: {
      id: staffId,
      email: "staff@triagemeazy.demo",
      nome: "Enfermeira Demo",
      role: "PROFISSIONAL",
      hospitalId: hospital.id,
    },
    update: { role: "PROFISSIONAL", hospitalId: hospital.id },
  });

  const pacienteUser = await prisma.user.upsert({
    where: { id: pacienteId },
    create: {
      id: pacienteId,
      email: "paciente@triagemeazy.demo",
      nome: "Paciente Demo",
      role: "PACIENTE",
    },
    update: {},
  });

  const paciente = await prisma.paciente.upsert({
    where: { userId: pacienteUser.id },
    create: {
      userId: pacienteUser.id,
      cpf: "00000000000",
      dataNascimento: new Date("1990-01-01"),
      telefone: "11999990000",
    },
    update: {},
  });

  const preTriagem = await prisma.preTriagem.create({
    data: {
      pacienteId: paciente.id,
      queixaPrincipal: "Dor de garganta e febre baixa há 2 dias",
      sintomas: ["dor de garganta", "febre baixa", "mal-estar"],
      duracaoSintomas: "2 dias",
      nivelDor: 3,
    },
  });

  await prisma.filaEntry.upsert({
    where: { preTriagemId: preTriagem.id },
    create: {
      hospitalId: hospital.id,
      pacienteId: paciente.id,
      preTriagemId: preTriagem.id,
      status: "EM_ANALISE",
    },
    update: {},
  });

  console.log("Seed concluído.");
  console.log(`Senha padrão para os usuários de demo: ${SEED_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
