"use server";

import { getSession } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/types";
import {
  atualizarPesquisa,
  criarParticipante,
  criarPesquisa,
  excluirPesquisa,
  identificarParticipantePublico,
  listarPesquisas,
  obterPesquisa,
  obterPesquisaPublica,
  responderPesquisaPrivada,
  responderPesquisaPublica,
  buscarParticipantePorContato,
} from "@/service/pesquisa-opiniao.service";
import type {
  AtualizarPesquisaOpiniaoPayload,
  CriarPesquisaOpiniaoPayload,
  Participante,
  PesquisaDetalhe,
  PesquisaOpiniao,
  RespostaRegistrada,
} from "@/types/pesquisa-opiniao";

export type PesquisaOpiniaoPrimitive = string | number | boolean;
export type PesquisaOpiniaoFilterValue =
  | PesquisaOpiniaoPrimitive
  | null
  | undefined
  | Array<PesquisaOpiniaoPrimitive | null | undefined>;

export type PesquisaOpiniaoFilters = Record<string, PesquisaOpiniaoFilterValue>;

export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
};

const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPERADMIN"];

async function requireSession() {
  const session = await getSession();
  if (!session?.token) {
    return { ok: false as const, message: "Sessao nao autenticada.", status: 401 };
  }

  return { ok: true as const, token: session.token, session };
}

async function requireAdminSession() {
  const auth = await requireSession();
  if (!auth.ok) {
    return auth;
  }

  if (!ADMIN_ROLES.includes(auth.session.user.papel)) {
    return { ok: false as const, message: "Perfil sem permissao para esta operacao.", status: 403 };
  }

  return auth;
}

export async function listarPesquisasOpiniao(): Promise<ApiResult<PesquisaOpiniao[]>> {
  const auth = await requireSession();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  return listarPesquisas(auth.token);
}

export async function obterPesquisaOpiniao(pesquisaId: string): Promise<ApiResult<PesquisaDetalhe>> {
  const auth = await requireSession();

  if (auth.ok) {
    const privateResult = await obterPesquisa(auth.token, pesquisaId);
    if (privateResult.ok) {
      return privateResult;
    }
  }

  return obterPesquisaPublica(pesquisaId);
}

export async function buscarParticipanteOpiniaoPorContato(contato: string): Promise<ApiResult<Participante>> {
  const auth = await requireSession();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  return buscarParticipantePorContato(auth.token, contato);
}

export async function criarParticipanteOpiniao(payload: {
  nome: string;
  email?: string;
  contatoOpcional?: string;
}): Promise<ApiResult<Participante>> {
  const auth = await requireSession();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  return criarParticipante(auth.token, payload);
}

export async function identificarParticipanteOpiniaoPublico(payload: {
  nome: string;
  telefone: string;
  email?: string;
}): Promise<ApiResult<Participante>> {
  return identificarParticipantePublico(payload);
}

export async function responderPesquisaOpiniaoPrivada(payload: {
  participanteId: string;
  pesquisaId: string;
  estado: string;
  cidade: string;
  bairro: string;
  canal?: "WHATSAPP" | "TELEFONE" | "PRESENCIAL" | "OUTRO";
  idade?: number;
  telefone?: string;
  latitude?: number | null;
  longitude?: number | null;
  respostas: Array<{ perguntaId: string; opcaoRespostaId: string }>;
}): Promise<ApiResult<RespostaRegistrada>> {
  const auth = await requireSession();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  return responderPesquisaPrivada(auth.token, payload);
}

export async function responderPesquisaOpiniaoPublica(
  pesquisaId: string,
  payload: {
    telefone: string;
    nome?: string;
    email?: string;
    estado: string;
    cidade: string;
    bairro: string;
    canal?: "WHATSAPP" | "TELEFONE" | "PRESENCIAL" | "OUTRO";
    idade?: number;
    respostas: Array<{ perguntaId: string; opcaoRespostaId: string }>;
  },
): Promise<ApiResult<RespostaRegistrada>> {
  return responderPesquisaPublica(pesquisaId, payload);
}

export async function criarPesquisaOpiniao(
  payload: CriarPesquisaOpiniaoPayload,
): Promise<ApiResult<PesquisaDetalhe>> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  return criarPesquisa(auth.token, payload);
}

export async function atualizarPesquisaOpiniao(
  pesquisaId: string,
  payload: AtualizarPesquisaOpiniaoPayload,
): Promise<ApiResult<PesquisaDetalhe>> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  return atualizarPesquisa(auth.token, pesquisaId, payload);
}

export async function excluirPesquisaOpiniao(pesquisaId: string): Promise<ApiResult<{ message?: string }>> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  const result = await excluirPesquisa(auth.token, pesquisaId);
  return {
    ok: result.ok,
    status: result.status,
    data: result.ok ? { message: result.message } : null,
    message: result.message,
  };
}