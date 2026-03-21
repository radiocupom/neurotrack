import type { ParticipanteIntencaoVotoNormalizado } from "@/types/intencao-voto";

export function normalizarParticipanteIntencaoVoto(data: unknown): ParticipanteIntencaoVotoNormalizado | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;
  const id =
    (typeof raw.participanteId === "string" ? raw.participanteId : null) ||
    (typeof raw.id === "string" ? raw.id : null);

  if (!id) {
    return null;
  }

  const nome = typeof raw.nome === "string" ? raw.nome.trim() : "";
  if (!nome) {
    return null;
  }

  return {
    id,
    nome,
    email: typeof raw.email === "string" ? raw.email.trim() || null : null,
    contato:
      (typeof raw.telefone === "string" ? raw.telefone.trim() : null) ||
      (typeof raw.contatoOpcional === "string" ? raw.contatoOpcional.trim() : null) ||
      null,
  };
}

export function validarParticipanteIntencaoVoto(participante: ParticipanteIntencaoVotoNormalizado | null) {
  return Boolean(participante?.id && participante.nome);
}