"use server";

import { getSession } from "@/lib/auth/session";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import {
  listarPesquisasOpiniaoDashboardFromExternalApi,
  listarPesquisasSensoDashboardFromExternalApi,
  obterAnaliseBigFiveDashboardFromExternalApi,
  obterAnaliseOpiniaoDashboardFromExternalApi,
  obterAnaliseSensoDashboardFromExternalApi,
  obterAuditoriaEntrevistadoresDashboardFromExternalApi,
  obterParticipantesOpiniaoDashboardFromExternalApi,
  obterParticipantesSensoDashboardFromExternalApi,
  obterParticipantesVotoDashboardFromExternalApi,
  obterPesquisasEntrevistadorDashboardFromExternalApi,
  obterResumoBigFiveDashboardFromExternalApi,
  obterResumoOpiniaoDashboardFromExternalApi,
  obterResumoSensoDashboardFromExternalApi,
  obterResumoVotoDashboardFromExternalApi,
} from "@/service/dashboard.service";
import type { DashboardFilterValue, DashboardFilters } from "@/service/dashboard-filters";

type DashboardQuery = Record<string, string | string[] | undefined>;

type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
};

function appendFilterValue(query: DashboardQuery, key: string, value: DashboardFilterValue) {
  if (value == null) {
    return;
  }

  if (Array.isArray(value)) {
    const values = value
      .map((item) => (item == null ? "" : String(item).trim()))
      .filter(Boolean);

    if (values.length > 0) {
      query[key] = values;
    }

    return;
  }

  const normalized = typeof value === "boolean" ? (value ? "true" : "false") : String(value).trim();

  if (normalized) {
    query[key] = normalized;
  }
}

function toDashboardQuery(filters?: DashboardFilters): DashboardQuery | undefined {
  if (!filters) {
    return undefined;
  }

  const query: DashboardQuery = {};
  Object.entries(filters).forEach(([key, value]) => appendFilterValue(query, key, value));

  return Object.keys(query).length > 0 ? query : undefined;
}

async function requireToken() {
  const session = await getSession();
  if (!session?.token) {
    return { ok: false as const, status: 401, message: "Sessao nao autenticada." };
  }

  return { ok: true as const, token: session.token };
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

export async function listarQuestionariosSensoAction(): Promise<ApiResult<unknown[]>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await listarPesquisasSensoDashboardFromExternalApi(auth.token);
    return { ok: true, status: 200, data: Array.isArray(data) ? data : [], message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar questionarios do dashboard de senso.");
  }
}

export async function listarPesquisasOpiniaoDashboardAction(): Promise<ApiResult<unknown[]>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await listarPesquisasOpiniaoDashboardFromExternalApi(auth.token);
    return { ok: true, status: 200, data: Array.isArray(data) ? data : [], message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar pesquisas do dashboard de opiniao.");
  }
}

export async function obterResumoSensoAction(
  questionarioId: string,
  filtros?: DashboardFilters,
): Promise<ApiResult<unknown>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await obterResumoSensoDashboardFromExternalApi(auth.token, questionarioId, toDashboardQuery(filtros));
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar resumo do dashboard de senso.");
  }
}

export async function obterParticipantesSensoAction(
  questionarioId: string,
  filtros?: DashboardFilters,
): Promise<ApiResult<unknown>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await obterParticipantesSensoDashboardFromExternalApi(auth.token, questionarioId, toDashboardQuery(filtros));
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar participantes do dashboard de senso.");
  }
}

export async function obterRelatorioSensoAction(
  questionarioId: string,
  filtros?: DashboardFilters,
): Promise<ApiResult<unknown>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await obterAnaliseSensoDashboardFromExternalApi(auth.token, questionarioId, toDashboardQuery(filtros));
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar relatorio IA do dashboard de senso.");
  }
}

export async function obterResumoBigFiveAction(filtros?: DashboardFilters): Promise<ApiResult<unknown>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await obterResumoBigFiveDashboardFromExternalApi(auth.token, toDashboardQuery(filtros));
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar resumo do dashboard Big Five.");
  }
}

export async function obterRelatorioBigFiveAction(filtros?: DashboardFilters): Promise<ApiResult<unknown>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await obterAnaliseBigFiveDashboardFromExternalApi(auth.token, toDashboardQuery(filtros));
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar relatorio IA do dashboard Big Five.");
  }
}

export async function obterResumoOpiniaoDashboardAction(
  pesquisaId: string,
  filtros?: DashboardFilters,
): Promise<ApiResult<unknown>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await obterResumoOpiniaoDashboardFromExternalApi(auth.token, pesquisaId, toDashboardQuery(filtros));
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar resumo do dashboard de opiniao.");
  }
}

export async function obterParticipantesOpiniaoDashboardAction(
  pesquisaId: string,
  filtros?: DashboardFilters,
): Promise<ApiResult<unknown>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await obterParticipantesOpiniaoDashboardFromExternalApi(auth.token, pesquisaId, toDashboardQuery(filtros));
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar participantes do dashboard de opiniao.");
  }
}

export async function obterRelatorioOpiniaoDashboardAction(
  pesquisaId: string,
  filtros?: DashboardFilters,
): Promise<ApiResult<unknown>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await obterAnaliseOpiniaoDashboardFromExternalApi(auth.token, pesquisaId, toDashboardQuery(filtros));
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar relatorio IA do dashboard de opiniao.");
  }
}

/**
 * Resumo da pesquisa de intenção de voto.
 * Fonte: GET /dashboard/resultado/intencao/:pesquisaId
 * Quando filtros são enviados, o backend recalcula os totais do resumo.
 */
export async function obterResumoVotoDashboardAction(
  pesquisaId: string,
  filtros?: DashboardFilters,
): Promise<ApiResult<unknown>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await obterResumoVotoDashboardFromExternalApi(auth.token, pesquisaId, toDashboardQuery(filtros));
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar resumo do dashboard de voto.");
  }
}

/**
 * Lista detalhada de participantes/votos com filtros geográficos e paginação.
 * Fonte: GET /dashboard/resultado/intencao/:pesquisaId/participantes
 * Retorna totalFiltrado — não misturar com totalRespostas do consolidado.
 */
export async function obterParticipantesVotoDashboardAction(
  pesquisaId: string,
  filtros?: DashboardFilters,
): Promise<ApiResult<unknown>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await obterParticipantesVotoDashboardFromExternalApi(auth.token, pesquisaId, toDashboardQuery(filtros));
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar participantes do dashboard de voto.");
  }
}

export async function obterAuditoriaEntrevistadoresDashboardAction(
  filtros?: DashboardFilters,
): Promise<ApiResult<unknown>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await obterAuditoriaEntrevistadoresDashboardFromExternalApi(auth.token, toDashboardQuery(filtros));
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar auditoria de entrevistadores.");
  }
}

export async function obterPesquisasEntrevistadorDashboardAction(
  entrevistadorId: string,
  filtros?: DashboardFilters,
): Promise<ApiResult<unknown>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await obterPesquisasEntrevistadorDashboardFromExternalApi(
      auth.token,
      entrevistadorId,
      toDashboardQuery(filtros),
    );
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Falha ao carregar detalhes do entrevistador.");
  }
}