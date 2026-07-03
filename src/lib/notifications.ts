import type { Prisma, PrismaClient, NotificacaoTipo } from "@/generated/prisma/client";
import { sendNotificationEmail } from "@/lib/email";

type Tx = PrismaClient | Prisma.TransactionClient;

/**
 * Cria a notificação in-app e dispara o e-mail (Resend) em paralelo,
 * best-effort — push (FCM) fica para depois.
 */
export async function enqueueNotificacao(
  prisma: Tx,
  input: {
    userId: string;
    tipo: NotificacaoTipo;
    titulo: string;
    mensagem: string;
    filaEntryId?: string;
  },
) {
  const [notificacao, user] = await Promise.all([
    prisma.notificacao.create({ data: input }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true },
    }),
  ]);

  if (user) {
    // Não aguardamos o envio para não atrasar a resposta da mutation que
    // disparou a notificação — erro de e-mail é logado, nunca lançado.
    void sendNotificationEmail({
      to: user.email,
      titulo: input.titulo,
      mensagem: input.mensagem,
    });
  }

  return notificacao;
}
