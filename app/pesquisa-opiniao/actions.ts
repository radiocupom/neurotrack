"use server";

import { getSession } from "@/lib/auth/session";
import {
  buscarParticipantePorContato,
  criarParticipante,
} from "@/service/pesquisa-opiniao.service";
import type { Participante } from "@/types/pesquisa-opiniao";

type BuscarOuCriarParticipanteResult = {
  ok: boolean;
  status: number;
  data: Participante | null;
  message: string;
};

export async function buscarOuCriarParticipantePrivadoAction(input: {
  contato: string;
  nome?: string;
  email?: string;
}): Promise<BuscarOuCriarParticipanteResult> {
  const contato = input.contato?.trim() ?? "";
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

  const busca = await buscarParticipantePorContato(session.token, contato);
  if (busca.ok && busca.data) {
    return {
      ok: true,
      status: 200,
      data: busca.data,
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
