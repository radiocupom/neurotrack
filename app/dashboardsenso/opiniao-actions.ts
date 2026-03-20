"use server";

import { getSession } from "@/lib/auth/session";
import {
  listarPesquisasOpiniaoDashboardFromExternalApi,
  obterResumoOpiniaoDashboardFromExternalApi,
  obterParticipantesOpiniaoDashboardFromExternalApi,
} from "@/service/dashboard.service";
import { readExternalApiErrorMessage, ExternalApiError } from "@/service/api";
import type { DashboardFilters } from "@/service/dashboard-workflow.service";

type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

async function requireToken(): Promise<{ token: string } | { token: null; message: string }> {
  const session = await getSession();
  if (!session?.token) {
    return { token: null, message: "Sessao nao autenticada." };
  }
  return { token: session.token };
}

function handleError(error: unknown, fallback: string): ActionResult<never> {
  if (error instanceof ExternalApiError) {
    return { ok: false, message: readExternalApiErrorMessage(error) || fallback };
  }
  return { ok: false, message: fallback };
}

export async function listarPesquisasOpiniaoDashboardAction(): Promise<ActionResult<unknown>> {
  console.log("[opiniao-actions] listarPesquisas: iniciando");
  const auth = await requireToken();
  if (!auth.token) {
    console.log("[opiniao-actions] listarPesquisas: sem token -", auth.message);
    return { ok: false, message: auth.message };
  }

  try {
    const data = await listarPesquisasOpiniaoDashboardFromExternalApi(auth.token);
    console.log("[opiniao-actions] listarPesquisas: resposta da API ->", JSON.stringify(data, null, 2));
    return { ok: true, data };
  } catch (error) {
    console.error("[opiniao-actions] listarPesquisas: erro ->", error);
    return handleError(error, "Falha ao carregar pesquisas de opiniao do dashboard.");
  }
}

export async function obterResumoOpiniaoDashboardAction(
  pesquisaId: string,
  filtros?: DashboardFilters,
): Promise<ActionResult<unknown>> {
  console.log("[opiniao-actions] obterResumo: pesquisaId =", pesquisaId, "| filtros =", filtros);
  const auth = await requireToken();
  if (!auth.token) {
    console.log("[opiniao-actions] obterResumo: sem token -", auth.message);
    return { ok: false, message: auth.message };
  }

  try {
    const data = await obterResumoOpiniaoDashboardFromExternalApi(
      auth.token,
      pesquisaId,
      filtros as Record<string, string | string[]>,
    );
    console.log("[opiniao-actions] obterResumo: resposta da API ->", JSON.stringify(data, null, 2));
    return { ok: true, data };
  } catch (error) {
    console.error("[opiniao-actions] obterResumo: erro ->", error);
    return handleError(error, "Falha ao carregar resumo do dashboard de opiniao.");
  }
}

export async function obterParticipantesOpiniaoDashboardAction(
  pesquisaId: string,
  filtros?: DashboardFilters,
): Promise<ActionResult<unknown>> {
  console.log("[opiniao-actions] obterParticipantes: pesquisaId =", pesquisaId, "| filtros =", filtros);
  const auth = await requireToken();
  if (!auth.token) {
    console.log("[opiniao-actions] obterParticipantes: sem token -", auth.message);
    return { ok: false, message: auth.message };
  }

  try {
    const data = await obterParticipantesOpiniaoDashboardFromExternalApi(
      auth.token,
      pesquisaId,
      filtros as Record<string, string | string[]>,
    );
    console.log("[opiniao-actions] obterParticipantes: resposta da API ->", JSON.stringify(data, null, 2));
    return { ok: true, data };
  } catch (error) {
    console.error("[opiniao-actions] obterParticipantes: erro ->", error);
    return handleError(error, "Falha ao carregar participantes do dashboard de opiniao.");
  }
}
