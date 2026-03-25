"use server";

import { getSession } from "@/lib/auth/session";
import { normalizarParticipanteIntencaoVoto } from "@/lib/helpers/normalize-participante-intencao-voto";
import {
  buscarParticipanteIntencaoDeVotoPorContato,
  buscarParticipanteIntencaoDeVotoPorTelefone,
  criarParticipanteIntencaoDeVoto,
} from "@/service/intencaoDeVoto.service";
import { identificarParticipanteFromExternalApi } from "@/service/participantes.service";
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

type ParticipantePrecheck = {
  participante: ParticipanteIntencaoVoto | null;
  jaRespondeu: boolean;
  podeResponder: boolean;
};

function readParticipantePrecheck(data: unknown): ParticipantePrecheck {
  const payload = readObject(data);
  const status = readObject(payload?.status);

  const jaRespondeu =
    (typeof payload?.jaRespondeu === "boolean" ? payload.jaRespondeu : null) ??
    (typeof status?.jaRespondeu === "boolean" ? status.jaRespondeu : false);

  const podeResponder =
    (typeof payload?.podeResponder === "boolean" ? payload.podeResponder : null) ??
    (typeof status?.podeResponder === "boolean" ? status.podeResponder : true);

  const participante = normalizeParticipantResult(data);

  return { participante, jaRespondeu, podeResponder };
}

function summarizePayloadForDebug(data: unknown) {
  if (Array.isArray(data)) {
    const first = readObject(data[0]);
    return {
      kind: "array",
      length: data.length,
      firstKeys: first ? Object.keys(first) : [],
    };
  }

  const payload = readObject(data);
  return {
    kind: typeof data,
    keys: payload ? Object.keys(payload) : [],
    statusKeys: payload && readObject(payload.status) ? Object.keys(readObject(payload.status) as Record<string, unknown>) : [],
  };
}

type ParticipantInput = {
  contato: string;
  pesquisaId?: string;
  nome?: string;
  email?: string;
};

export async function buscarOuCriarParticipanteIntencaoVotoPrivadoAction(
  input: ParticipantInput,
): Promise<ApiResponse<ParticipanteIntencaoVoto>> {
  const contato = input.contato?.trim() ?? "";
  const pesquisaId = input.pesquisaId?.trim() || undefined;
  const nome = input.nome?.trim();
  const email = input.email?.trim();

  if (!contato) {
    return { ok: false, status: 400, data: null, message: "Informe o contato do participante." };
  }

  const session = await getSession();
  if (!session?.token) {
    return { ok: false, status: 401, data: null, message: "Sessao invalida. Faca login novamente." };
  }

  const busca = await buscarParticipanteIntencaoDeVotoPorContato(session.token, contato, pesquisaId);
  console.info("[intencao-voto][action][participante] retorno buscar-por-contato", {
    pesquisaId,
    contatoInformado: Boolean(contato),
    ok: busca.ok,
    status: busca.status,
    message: busca.message,
    payloadShape: summarizePayloadForDebug(busca.data),
  });

  if (busca.status === 409) {
    return {
      ok: false,
      status: 409,
      data: null,
      message: busca.message || "Este participante já respondeu esta pesquisa.",
    };
  }

  if (busca.ok && busca.data) {
    const precheck = readParticipantePrecheck(busca.data);
    console.info("[intencao-voto][action][participante] resultado precheck", {
      pesquisaId,
      jaRespondeu: precheck.jaRespondeu,
      podeResponder: precheck.podeResponder,
      hasParticipante: Boolean(precheck.participante),
    });

    if (precheck.jaRespondeu || !precheck.podeResponder) {
      return {
        ok: false,
        status: 409,
        data: null,
        message: "Este participante já respondeu esta pesquisa.",
      };
    }

    if (precheck.participante) {
      return { ok: true, status: 200, data: precheck.participante, message: "Participante encontrado." };
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
  payload: { telefone: string; nome?: string; email?: string },
): Promise<ApiResponse<ParticipanteIntencaoVoto>> {
  const contato = payload.telefone.trim();
  const nome = payload.nome?.trim();
  const email = payload.email?.trim();

  if (!contato) {
    return { ok: false, status: 400, data: null, message: "Informe o telefone do participante." };
  }

  if (!nome) {
    return { ok: false, status: 400, data: null, message: "Informe o nome do participante." };
  }

  try {
    const data = await identificarParticipanteFromExternalApi({
      telefone: contato,
      nome,
      email: email || undefined,
    });

    const participante = normalizeParticipantResult(data);
    if (!participante) {
      return {
        ok: false,
        status: 502,
        data: null,
        message: "Nao foi possivel validar o participante retornado.",
      };
    }

    return { ok: true, status: 200, data: participante, message: "Participante identificado." };
  } catch {
    return buscarParticipanteIntencaoDeVotoPorTelefone(contato);
  }
}
