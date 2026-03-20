"use server";

import { getSession } from "@/lib/auth/session";
import {
  buscarParticipantePorContato,
  criarParticipante,
} from "@/service/pesquisa-opiniao.service";
import type { Participante } from "@/types/pesquisa-opiniao";

type ParticipantePrecheck = {
  participante: Participante | null;
  jaRespondeu: boolean;
  podeResponder: boolean;
};

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readParticipantePrecheck(data: unknown): ParticipantePrecheck {
  const payload = readObject(data);
  const status = readObject(payload?.status);

  const jaRespondeu =
    (typeof payload?.jaRespondeu === "boolean" ? payload.jaRespondeu : null) ??
    (typeof status?.jaRespondeu === "boolean" ? status.jaRespondeu : false);

  const podeResponder =
    (typeof payload?.podeResponder === "boolean" ? payload.podeResponder : null) ??
    (typeof status?.podeResponder === "boolean" ? status.podeResponder : true);

  const participanteSource = readObject(payload?.participante) ?? payload;

  const participanteId =
    typeof participanteSource?.id === "string"
      ? participanteSource.id
      : typeof participanteSource?.participanteId === "string"
        ? participanteSource.participanteId
        : "";

  const participanteNome = typeof participanteSource?.nome === "string" ? participanteSource.nome : "";

  const participante = participanteId && participanteNome
    ? {
        id: participanteId,
        nome: participanteNome,
        email: typeof participanteSource?.email === "string" ? participanteSource.email : null,
        telefone: typeof participanteSource?.telefone === "string" ? participanteSource.telefone : null,
        contatoOpcional: typeof participanteSource?.contatoOpcional === "string" ? participanteSource.contatoOpcional : null,
      }
    : null;

  return {
    participante,
    jaRespondeu,
    podeResponder,
  };
}

type BuscarOuCriarParticipanteResult = {
  ok: boolean;
  status: number;
  data: Participante | null;
  message: string;
};

export async function buscarOuCriarParticipantePrivadoAction(input: {
  contato: string;
  pesquisaId?: string;
  nome?: string;
  email?: string;
}): Promise<BuscarOuCriarParticipanteResult> {
  const contato = input.contato?.trim() ?? "";
  const pesquisaId = input.pesquisaId?.trim() || undefined;
  const nome = input.nome?.trim();
  const email = input.email?.trim();

  if (!contato) {
    return {
      ok: false,
      status: 400,
      data: null,
      message: "Contato invalido.",
    };
  }

  const session = await getSession();
  if (!session?.token) {
    return {
      ok: false,
      status: 401,
      data: null,
      message: "Sessao invalida. Faca login novamente.",
    };
  }

  const busca = await buscarParticipantePorContato(session.token, contato, pesquisaId);
  if (busca.ok && busca.data) {
    const precheck = readParticipantePrecheck(busca.data);

    if (precheck.jaRespondeu || !precheck.podeResponder) {
      return {
        ok: false,
        status: 409,
        data: null,
        message: "Este participante já respondeu esta pesquisa.",
      };
    }

    if (!precheck.participante) {
      return {
        ok: false,
        status: 502,
        data: null,
        message: "Nao foi possivel identificar os dados do participante retornado.",
      };
    }

    return {
      ok: true,
      status: 200,
      data: precheck.participante,
      message: "Participante encontrado.",
    };
  }

  if (busca.status !== 404) {
    return {
      ok: false,
      status: busca.status,
      data: null,
      message: busca.message || "Erro ao buscar participante.",
    };
  }

  if (!nome) {
    return {
      ok: false,
      status: 400,
      data: null,
      message: "Nome e obrigatorio para criar novo participante.",
    };
  }

  const criacao = await criarParticipante(session.token, {
    nome,
    email: email || undefined,
    contatoOpcional: contato,
  });

  return {
    ok: criacao.ok,
    status: criacao.status,
    data: criacao.data,
    message: criacao.message,
  };
}
