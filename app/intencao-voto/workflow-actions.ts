"use server";

import { getSession } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/types";
import {
  atualizarCacheIntencaoDeVoto,
  atualizarPesquisaIntencaoDeVoto,
  buscarPesquisaIntencaoDeVotoPorId,
  buscarPesquisaIntencaoDeVotoPublica,
  buscarResultadosIntencaoDeVoto,
  buscarStatusFilaIntencaoDeVoto,
  criarPesquisaIntencaoDeVoto,
  deletarPesquisaIntencaoDeVoto,
  listarPesquisasIntencaoDeVoto,
  registrarVotoIntencaoDeVoto,
  registrarVotoIntencaoDeVotoPublico,
} from "@/service/intencaoDeVoto.service";
import type {
  ApiResponse,
  AtualizarPesquisaIntencaoVotoPayload,
  CriarPesquisaIntencaoVotoPayload,
  PesquisaIntencaoVoto,
  PesquisaIntencaoVotoDetalhe,
  PayloadRegistrarVotoPrivado,
  PayloadRegistrarVotoPublico,
  ResultadoIntencaoVoto,
  StatusFilaIntencaoVoto,
  VotoRegistrado,
} from "@/types/intencao-voto";

const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPERADMIN"];

function summarizePayloadForLog(payload: CriarPesquisaIntencaoVotoPayload | AtualizarPesquisaIntencaoVotoPayload | FormData) {
  if (!(payload instanceof FormData)) {
    return payload;
  }

  const serialized: Record<string, unknown> = {};
  for (const [key, value] of payload.entries()) {
    const nextValue =
      typeof File !== "undefined" && value instanceof File
        ? { name: value.name, size: value.size, type: value.type }
        : value;

    if (key in serialized) {
      const currentValue = serialized[key];
      serialized[key] = Array.isArray(currentValue) ? [...currentValue, nextValue] : [currentValue, nextValue];
      continue;
    }

    serialized[key] = nextValue;
  }

  return serialized;
}

async function requireSession() {
  const session = await getSession();
  if (!session?.token) {
    return { ok: false as const, status: 401, message: "Sessao nao autenticada." };
  }

  return { ok: true as const, token: session.token, session };
}

async function requireAdminSession() {
  const auth = await requireSession();
  if (!auth.ok) {
    return auth;
  }

  if (!ADMIN_ROLES.includes(auth.session.user.papel)) {
    return { ok: false as const, status: 403, message: "Perfil sem permissao para esta operacao." };
  }

  return auth;
}

export async function listarPesquisasIntencaoVotoAction(): Promise<ApiResponse<PesquisaIntencaoVoto[]>> {
  const auth = await requireSession();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  return listarPesquisasIntencaoDeVoto(auth.token);
}

export async function obterPesquisaIntencaoVotoAction(
  pesquisaId: string,
): Promise<ApiResponse<PesquisaIntencaoVotoDetalhe>> {
  const auth = await requireSession();

  if (auth.ok) {
    const privateResult = await buscarPesquisaIntencaoDeVotoPorId(auth.token, pesquisaId);
    if (privateResult.ok) {
      return privateResult;
    }
  }

  return buscarPesquisaIntencaoDeVotoPublica(pesquisaId);
}

export async function obterPesquisaIntencaoVotoPublicaAction(
  pesquisaId: string,
): Promise<ApiResponse<PesquisaIntencaoVotoDetalhe>> {
  return buscarPesquisaIntencaoDeVotoPublica(pesquisaId);
}

export async function criarPesquisaIntencaoVotoAction(
  payload: CriarPesquisaIntencaoVotoPayload | FormData,
): Promise<ApiResponse<PesquisaIntencaoVotoDetalhe>> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  console.log("[intencao-voto][action][create] payload recebido", {
    userId: auth.session.user.id,
    role: auth.session.user.papel,
    body: summarizePayloadForLog(payload),
  });

  const result = await criarPesquisaIntencaoDeVoto(auth.token, payload);

  console.log("[intencao-voto][action][create] resposta do service", {
    ok: result.ok,
    status: result.status,
    message: result.message,
    pesquisaId: result.data?.id || null,
  });

  return result;
}

export async function atualizarPesquisaIntencaoVotoAction(
  pesquisaId: string,
  payload: AtualizarPesquisaIntencaoVotoPayload | FormData,
): Promise<ApiResponse<PesquisaIntencaoVotoDetalhe>> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  console.log("[intencao-voto][action][edit] payload recebido", {
    pesquisaId,
    userId: auth.session.user.id,
    role: auth.session.user.papel,
    body: summarizePayloadForLog(payload),
  });

  const result = await atualizarPesquisaIntencaoDeVoto(auth.token, pesquisaId, payload);

  console.log("[intencao-voto][action][edit] resposta do service", {
    pesquisaId,
    ok: result.ok,
    status: result.status,
    message: result.message,
    returnedPesquisaId: result.data?.id || null,
  });

  return result;
}

export async function excluirPesquisaIntencaoVotoAction(
  pesquisaId: string,
): Promise<ApiResponse<{ message?: string }>> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  return deletarPesquisaIntencaoDeVoto(auth.token, pesquisaId);
}

export async function registrarVotoIntencaoVotoPrivadoAction(
  payload: PayloadRegistrarVotoPrivado,
): Promise<ApiResponse<VotoRegistrado>> {
  const auth = await requireSession();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  return registrarVotoIntencaoDeVoto(auth.token, payload);
}

export async function registrarVotoIntencaoVotoPublicoAction(
  pesquisaId: string,
  payload: PayloadRegistrarVotoPublico,
): Promise<ApiResponse<VotoRegistrado>> {
  return registrarVotoIntencaoDeVotoPublico(pesquisaId, payload);
}

export async function obterResultadosIntencaoVotoAction(
  pesquisaId: string,
): Promise<ApiResponse<ResultadoIntencaoVoto>> {
  const auth = await requireSession();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  return buscarResultadosIntencaoDeVoto(auth.token, pesquisaId);
}

export async function obterStatusFilaIntencaoVotoAction(): Promise<ApiResponse<StatusFilaIntencaoVoto>> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  return buscarStatusFilaIntencaoDeVoto(auth.token);
}

export async function atualizarCacheIntencaoVotoAction(): Promise<ApiResponse<Record<string, unknown>>> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  return atualizarCacheIntencaoDeVoto(auth.token);
}
