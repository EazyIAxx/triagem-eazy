import "server-only";
import { Resend } from "resend";

let client: Resend | null | undefined;

function getClient(): Resend | null {
  if (client !== undefined) return client;

  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "[email] RESEND_API_KEY ausente — pulando envio de e-mail (notificação in-app segue funcionando normalmente).",
    );
    client = null;
    return client;
  }

  client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

/**
 * Envio best-effort — nunca lança. Falha de e-mail não deve derrubar a
 * mutation que criou a notificação (a fonte da verdade é `Notificacao` no
 * banco; o e-mail é só um reforço).
 */
export async function sendNotificationEmail(input: {
  to: string;
  titulo: string;
  mensagem: string;
}) {
  const resend = getClient();
  if (!resend) return;

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Triagem Eazy <onboarding@resend.dev>",
      to: input.to,
      subject: input.titulo,
      text: input.mensagem,
    });
    if (error) {
      console.error("[email] Falha ao enviar via Resend:", error);
    }
  } catch (err) {
    console.error("[email] Erro inesperado ao enviar via Resend:", err);
  }
}
