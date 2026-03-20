/**
 * Dashboard Workflow com Cache
 * Wrapper das funções de dashboard com cache integrado
 * Mantém 100% de compatibilidade com o código existente
 */

import { cacheManager, CacheManager } from "@/lib/cache/cache-manager";
import type { DashboardFilters } from "@/service/dashboard-workflow.service";
import * as DashboardWorkflow from "@/service/dashboard-workflow.service";

/**
 * Configuração de TTL para diferentes tipos de dados
 * Dados que mudam com menos frequência têm TTL maior
 */
const CACHE_CONFIG = {
  // Questionários mudam raramente
  QUESTIONARIOS_SENSO: 30 * 60 * 1000, // 30 minutos
  BIGFIVE_QUESTIONARIO: 60 * 60 * 1000, // 1 hora

  // Resumos e análises mudam regularmente conforme novas respostas chegam
  RESUMO_SENSO: 2 * 60 * 1000, // 2 minutos
  RESUMO_BIGFIVE: 2 * 60 * 1000, // 2 minutos

  // Análises e relatórios IA (mais pesados, menos frequentes)
  ANALISE_SENSO: 5 * 60 * 1000, // 5 minutos
  ANALISE_BIGFIVE: 5 * 60 * 1000, // 5 minutos
  RELATORIO_SENSO: 5 * 60 * 1000, // 5 minutos
  RELATORIO_BIGFIVE: 5 * 60 * 1000, // 5 minutos

  // Participantes (podem mudar frequentemente)
  PARTICIPANTES_SENSO: 2 * 60 * 1000, // 2 minutos
};

/**
 * Wrapper para listarQuestionariosSenso com cache
 */
export async function listarQuestionariosSenso() {
  const cacheKey = CacheManager.generateKey("dashboard", "questionarios-senso");

  return cacheManager.getOrExecute(
    cacheKey,
    () => DashboardWorkflow.listarQuestionariosSenso(),
    { ttl: CACHE_CONFIG.QUESTIONARIOS_SENSO },
  );
}

/**
 * Wrapper para obterResumoSenso com cache
 * Cache é invalidado quando filtros mudam
 */
export async function obterResumoSenso(questionarioId: string, filtros?: DashboardFilters) {
  const cacheKey = CacheManager.generateKey("dashboard", "resumo-senso", questionarioId, filtros);

  return cacheManager.getOrExecute(
    cacheKey,
    () => DashboardWorkflow.obterResumoSenso(questionarioId, filtros),
    { ttl: CACHE_CONFIG.RESUMO_SENSO },
  );
}

/**
 * Wrapper para obterParticipantesSenso com cache
 */
export async function obterParticipantesSenso(questionarioId: string, filtros?: DashboardFilters) {
  const cacheKey = CacheManager.generateKey("dashboard", "participantes-senso", questionarioId, filtros);

  return cacheManager.getOrExecute(
    cacheKey,
    () => DashboardWorkflow.obterParticipantesSenso(questionarioId, filtros),
    { ttl: CACHE_CONFIG.PARTICIPANTES_SENSO },
  );
}

/**
 * Wrapper para obterAnaliseSenso com cache
 */
export async function obterAnaliseSenso(questionarioId: string, filtros?: DashboardFilters) {
  const cacheKey = CacheManager.generateKey("dashboard", "analise-senso", questionarioId, filtros);

  return cacheManager.getOrExecute(
    cacheKey,
    () => DashboardWorkflow.obterAnaliseSenso(questionarioId, filtros),
    { ttl: CACHE_CONFIG.ANALISE_SENSO },
  );
}

/**
 * Wrapper para obterRelatorioSenso com cache
 */
export async function obterRelatorioSenso(questionarioId: string, filtros?: DashboardFilters) {
  const cacheKey = CacheManager.generateKey("dashboard", "relatorio-senso", questionarioId, filtros);

  return cacheManager.getOrExecute(
    cacheKey,
    () => DashboardWorkflow.obterRelatorioSenso(questionarioId, filtros),
    { ttl: CACHE_CONFIG.RELATORIO_SENSO },
  );
}

/**
 * Wrapper para obterResumoBigFive com cache
 */
export async function obterResumoBigFive(filtros?: DashboardFilters) {
  const cacheKey = CacheManager.generateKey("dashboard", "resumo-bigfive", filtros);

  return cacheManager.getOrExecute(
    cacheKey,
    () => DashboardWorkflow.obterResumoBigFive(filtros),
    { ttl: CACHE_CONFIG.RESUMO_BIGFIVE },
  );
}

/**
 * Wrapper para obterAnaliseBigFive com cache
 */
export async function obterAnaliseBigFive(filtros?: DashboardFilters) {
  const cacheKey = CacheManager.generateKey("dashboard", "analise-bigfive", filtros);

  return cacheManager.getOrExecute(
    cacheKey,
    () => DashboardWorkflow.obterAnaliseBigFive(filtros),
    { ttl: CACHE_CONFIG.ANALISE_BIGFIVE },
  );
}

/**
 * Wrapper para obterRelatorioBigFive com cache
 */
export async function obterRelatorioBigFive(filtros?: DashboardFilters) {
  const cacheKey = CacheManager.generateKey("dashboard", "relatorio-bigfive", filtros);

  return cacheManager.getOrExecute(
    cacheKey,
    () => DashboardWorkflow.obterRelatorioBigFive(filtros),
    { ttl: CACHE_CONFIG.RELATORIO_BIGFIVE },
  );
}

/**
 * Funções de invalidação de cache
 * Use quando dados são atualizados manualmente
 */

export function invalidateQuestionariosSenso() {
  cacheManager.invalidateByPattern("dashboard::questionarios-senso*");
}

export function invalidateResumoSenso(questionarioId?: string) {
  if (questionarioId) {
    cacheManager.invalidateByPattern(`dashboard::resumo-senso::${questionarioId}*`);
  } else {
    cacheManager.invalidateByPattern("dashboard::resumo-senso*");
  }
}

export function invalidateParticipantesSenso(questionarioId?: string) {
  if (questionarioId) {
    cacheManager.invalidateByPattern(`dashboard::participantes-senso::${questionarioId}*`);
  } else {
    cacheManager.invalidateByPattern("dashboard::participantes-senso*");
  }
}

export function invalidateAnaliseSenso(questionarioId?: string) {
  if (questionarioId) {
    cacheManager.invalidateByPattern(`dashboard::analise-senso::${questionarioId}*`);
  } else {
    cacheManager.invalidateByPattern("dashboard::analise-senso*");
  }
}

export function invalidateRelatorioSenso(questionarioId?: string) {
  if (questionarioId) {
    cacheManager.invalidateByPattern(`dashboard::relatorio-senso::${questionarioId}*`);
  } else {
    cacheManager.invalidateByPattern("dashboard::relatorio-senso*");
  }
}

export function invalidateResumoBigFive() {
  cacheManager.invalidateByPattern("dashboard::resumo-bigfive*");
}

export function invalidateAnaliseBigFive() {
  cacheManager.invalidateByPattern("dashboard::analise-bigfive*");
}

export function invalidateRelatorioBigFive() {
  cacheManager.invalidateByPattern("dashboard::relatorio-bigfive*");
}

/**
 * Invalida todo o cache de dashboard
 */
export function invalidateAllDashboardCache() {
  cacheManager.invalidateByPattern("dashboard::*");
}

/**
 * Re-exporta tipos para compatibilidade
 */
export type { DashboardFilters };
