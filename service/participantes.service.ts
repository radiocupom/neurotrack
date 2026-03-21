import { externalApiRequest } from "@/service/api";

export type Participante = {
  id: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  contatoOpcional?: string | null;
};

export type CriarParticipantePayload = {
  nome: string;
  email?: string;
  contatoOpcional: string;
};

export type IdentificarParticipantePayload = {
  nome: string;
  telefone: string;
  email?: string;
};

export function listarParticipantesFromExternalApi(token: string) {
  return externalApiRequest<Participante[] | { data?: Participante[]; items?: Participante[] }>(
    "/participantes",
    {
      method: "GET",
      token,
      requiresAuth: true,
      requiresPrivateToken: true,
    },
  );
}

export function identificarParticipanteFromExternalApi(payload: IdentificarParticipantePayload) {
  return externalApiRequest<Participante | { participante?: Participante }>("/participantes/identificar", {
    method: "POST",
    body: payload,
  });
}

export function buscarParticipantePorTelefoneFromExternalApi(telefone: string) {
  return externalApiRequest<Participante>(`/participantes/telefone/${encodeURIComponent(telefone)}`, {
    method: "GET",
  });
}

export function buscarParticipantePorContatoFromExternalApi(token: string, contato: string) {
  return externalApiRequest<Participante | Participante[] | { data?: Participante[]; items?: Participante[] }>(
    "/participantes/buscar-por-contato",
    {
      method: "GET",
      query: { contato },
      token,
      requiresAuth: true,
      requiresPrivateToken: true,
    },
  );
}

export function criarParticipanteFromExternalApi(token: string, payload: CriarParticipantePayload) {
  return externalApiRequest<Participante>("/participantes", {
    method: "POST",
    body: payload,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}
