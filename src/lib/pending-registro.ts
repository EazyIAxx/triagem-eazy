"use client";

/**
 * Ponte entre /registro e /completar-cadastro. O Supabase exige confirmar o
 * e-mail antes de existir sessão, então os dados de perfil digitados em
 * /registro (nome, CPF, nascimento, telefone, convênio) não podem ser
 * enviados na hora — ficam aqui até o usuário voltar já autenticado.
 */

const KEY = "triagem-eazy:pending-registro";

export type PendingRegistro = {
  nome: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  convenio: string;
};

export function salvarPendingRegistro(data: PendingRegistro) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // localStorage indisponível (modo privado etc) — segue sem pré-preencher.
  }
}

export function lerPendingRegistro(): PendingRegistro | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingRegistro) : null;
  } catch {
    return null;
  }
}

export function limparPendingRegistro() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignora
  }
}
