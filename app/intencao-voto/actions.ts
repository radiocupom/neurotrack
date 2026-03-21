"use server";

import { getSession } from "@/lib/auth/session";
import { normalizarParticipanteIntencaoVoto } from "@/lib/helpers/normalize-participante-intencao-voto";
import {
  buscarParticipanteIntencaoDeVotoPorContato,
  buscarParticipanteIntencaoDeVotoPorTelefone,
  criarParticipanteIntencaoDeVoto,
} from "@/service/intencaoDeVoto.service";
import type { ApiResponse, ParticipanteIntencaoVoto } from "@/types/intencao-voto";

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function extractParticipantCandidate(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  const raw = readObject(data);
  if (!raw) {
    return data;
  }

  const options = [raw.participante, raw.data, raw.item, raw.resultado, raw.items];
  for (const option of options) {
    if (Array.isArray(option)) {
      return option[0] ?? null;
    }

    if (option != null) {
      return option;
    }
  }

  return raw;
}

function normalizeParticipantResult(data: unknown): ParticipanteIntencaoVoto | null {
  const normalized = normalizarParticipanteIntencaoVoto(extractParticipantCandidate(data));
  if (!normalized) {
    return null;
  }

  return {
    id: normalized.id,
    nome: normalized.nome,
    email: normalized.email,
    contatoOpcional: normalized.contato,
    telefone: normalized.contato,
  };
}

type ParticipantInput = {
  contato: string;
  nome?: string;
  email?: string;
};

export async function buscarOuCriarParticipanteIntencaoVotoPrivadoAction(
  input: ParticipantInput,
): Promise<ApiResponse<ParticipanteIntencaoVoto>> {
  const contato = input.contato?.trim() ?? "";
  const nome = input.nome?.trim();
  const email = input.email?.trim();

  if (!contato) {
    return { ok: false, status: 400, data: null, message: "Informe o contato do participante." };
  }

  const session = await getSession();
  if (!session?.token) {
    return { ok: false, status: 401, data: null, message: "Sessao invalida. Faca login novamente." };
  }

  const busca = await buscarParticipanteIntencaoDeVotoPorContato(session.token, contato);
  if (busca.ok) {
    const participante = normalizeParticipantResult(busca.data);
    if (participante) {
      return { ok: true, status: 200, data: participante, message: "Participante encontrado." };
    }
  }

  if (busca.status !== 404) {
    return {
      ok: false,
      status: busca.status,
      data: null,
      message: busca.message || "Falha ao buscar participante.",
    };
  }

  if (!nome) {
    return {
      ok: false,
      status: 400,
      data: null,
      message: "Nome e obrigatorio para cadastrar novo participante.",
    };
  }

  return criarParticipanteIntencaoDeVoto(session.token, {
    nome,
    email: email || undefined,
    contatoOpcional: contato,
  });
}

export async function identificarParticipanteIntencaoVotoPublicoAction(
  telefone: string,
): Promise<ApiResponse<ParticipanteIntencaoVoto>> {
  const contato = telefone.trim();
  if (!contato) {
    return { ok: false, status: 400, data: null, message: "Informe o telefone do participante." };
  }

  return buscarParticipanteIntencaoDeVotoPorTelefone(contato);
}
