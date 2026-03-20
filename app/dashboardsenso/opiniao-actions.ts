"use server";

import type { DashboardFilters } from "@/service/dashboard-filters";
import {
  listarPesquisasOpiniaoDashboardAction as listarPesquisasOpiniaoDashboardBaseAction,
  obterResumoOpiniaoDashboardAction as obterResumoOpiniaoDashboardBaseAction,
  obterParticipantesOpiniaoDashboardAction as obterParticipantesOpiniaoDashboardBaseAction,
} from "@/app/dashboardsenso/dashboard-actions";

export async function listarPesquisasOpiniaoDashboardAction() {
  return listarPesquisasOpiniaoDashboardBaseAction();
}

export async function obterResumoOpiniaoDashboardAction(
  pesquisaId: string,
  filtros?: DashboardFilters,
) {
  return obterResumoOpiniaoDashboardBaseAction(pesquisaId, filtros);
}

export async function obterParticipantesOpiniaoDashboardAction(
  pesquisaId: string,
  filtros?: DashboardFilters,
) {
  return obterParticipantesOpiniaoDashboardBaseAction(pesquisaId, filtros);
}
