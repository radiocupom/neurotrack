export type NormalizedParticipante = {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  contatoOpcional?: string;
};

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function fromCandidate(value: unknown): NormalizedParticipante | null {
  const item = readObject(value);

  if (!item) {
    return null;
  }

  const id =
    typeof item.id === "string"
      ? item.id
      : typeof item.participanteId === "string"
        ? item.participanteId
        : null;

  if (!id) {
    return null;
  }

  const contatoOpcional =
    typeof item.contatoOpcional === "string"
      ? item.contatoOpcional
      : typeof item.contato === "string"
        ? item.contato
        : undefined;

  const telefone =
    typeof item.telefone === "string"
      ? item.telefone
      : typeof item.contato === "string"
        ? item.contato
        : undefined;

  return {
    id,
    nome: typeof item.nome === "string" ? item.nome : "Participante",
    email: typeof item.email === "string" ? item.email : undefined,
    telefone,
    contatoOpcional,
  };
}

export function normalizeParticipanteResponse(payload: unknown): NormalizedParticipante | null {
  const direct = fromCandidate(payload);
  if (direct) {
    return direct;
  }

  const root = readObject(payload);
  if (!root) {
    return null;
  }

  const candidates = [
    root.participante,
    root.data,
    root.resultado,
    root.item,
    root.participant,
  ];

  for (const candidate of candidates) {
    const normalized = fromCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}
