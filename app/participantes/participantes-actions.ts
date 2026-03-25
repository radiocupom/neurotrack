"use server";

import { getSession } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/types";
import { CacheManager, withCache } from "@/lib/cache/cache-manager";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import {
  buscarParticipantePorTelefoneFromExternalApi,
  listarParticipantesComPesquisasFromExternalApi,
  obterParticipanteComPesquisasFromExternalApi,
  obterParticipantePorIdFromExternalApi,
  type Participante,
  type ParticipanteComPesquisas,
} from "@/service/participantes.service";

const ADMIN_ROLES: UserRole[] = ["SUPERADMIN", "ADMIN"];
const PARTICIPANTES_CACHE_TTL = 2 * 60 * 1000;

type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
};

function isAdminRole(role: UserRole) {
  return ADMIN_ROLES.includes(role);
}

async function requireAdminToken() {
  const session = await getSession();
  if (!session?.token || !session.user?.papel) {
    return { ok: false as const, status: 401, message: "Sessao nao autenticada." };
  }

  if (!isAdminRole(session.user.papel)) {
    return { ok: false as const, status: 403, message: "Perfil sem permissao para esta operacao." };
  }

  return { ok: true as const, token: session.token, userId: session.user.id };
}

function mapError<T>(error: unknown, fallback: string): ApiResult<T> {
  if (error instanceof ExternalApiError) {
    return {
      ok: false,
      status: error.status,
      data: null,
      message: readExternalApiErrorMessage(error) || fallback,
    };
  }

  return {
    ok: false,
    status: 500,
    data: null,
    message: fallback,
  };
}

export async function buscarParticipantePorTelefoneAction(telefone: string): Promise<ApiResult<Participante>> {
  try {
    const data = await buscarParticipantePorTelefoneFromExternalApi(telefone);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao consultar participante por telefone.");
  }
}

export async function listarParticipantesComPesquisasAction(): Promise<ApiResult<ParticipanteComPesquisas[]>> {
  const auth = await requireAdminToken();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  try {
    const cacheKey = CacheManager.generateKey("participantes", "com-pesquisas", "list", auth.userId);
    const data = await withCache(
      cacheKey,
      async () => listarParticipantesComPesquisasFromExternalApi(auth.token),
      PARTICIPANTES_CACHE_TTL,
    );

    return { ok: true, status: 200, data: Array.isArray(data) ? data : [], message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar participantes com pesquisas.");
  }
}

export async function obterParticipanteComPesquisasAction(participanteId: string): Promise<ApiResult<ParticipanteComPesquisas>> {
  const auth = await requireAdminToken();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  try {
    const cacheKey = CacheManager.generateKey("participantes", "com-pesquisas", participanteId, auth.userId);
    const data = await withCache(
      cacheKey,
      async () => obterParticipanteComPesquisasFromExternalApi(auth.token, participanteId),
      PARTICIPANTES_CACHE_TTL,
    );

    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar participante com pesquisas.");
  }
}

export async function obterParticipantePorIdAction(participanteId: string): Promise<ApiResult<Participante>> {
  const auth = await requireAdminToken();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  try {
    const data = await obterParticipantePorIdFromExternalApi(auth.token, participanteId);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar participante por ID.");
  }
}
