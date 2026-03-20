/**
 * Hooks para gerenciar cache do Dashboard
 * Oferece funções para invalidar cache manualmente
 */

import { useCallback } from "react";
import {
  invalidateAllDashboardCache,
  invalidateAnaliseBigFive,
  invalidateAnaliseSenso,
  invalidateParticipantesSenso,
  invalidateQuestionariosSenso,
  invalidateRelatorioSenso,
  invalidateResumoBigFive,
  invalidateResumoSenso,
} from "@/lib/cache/cached-dashboard-workflow";

/**
 * Hook para invalidar cache do dashboard
 * Use quando dados são atualizados manualmente
 *
 * Exemplo:
 * ```typescript
 * const { invalidateAll, invalidateResumo } = useInvalidateDashboardCache();
 *
 * const handleCreateParticipante = async (data) => {
 *   await api.createParticipante(data);
 *   invalidateResumoBigFive(); // Atualiza dashboard
 * };
 * ```
 */
export function useInvalidateDashboardCache() {
  const invalidateAll = useCallback(() => {
    invalidateAllDashboardCache();
  }, []);

  const invalidateQuestionarios = useCallback(() => {
    invalidateQuestionariosSenso();
  }, []);

  const invalidateResumoSensoData = useCallback((questionarioId?: string) => {
    invalidateResumoSenso(questionarioId);
  }, []);

  const invalidateParticipantesData = useCallback((questionarioId?: string) => {
    invalidateParticipantesSenso(questionarioId);
  }, []);

  const invalidateAnaliseSensoData = useCallback((questionarioId?: string) => {
    invalidateAnaliseSenso(questionarioId);
  }, []);

  const invalidateRelatorioSensoData = useCallback((questionarioId?: string) => {
    invalidateRelatorioSenso(questionarioId);
  }, []);

  const invalidateResumoBigFiveData = useCallback(() => {
    invalidateResumoBigFive();
  }, []);

  const invalidateAnaliseBigFiveData = useCallback(() => {
    invalidateAnaliseBigFive();
  }, []);

  return {
    // Invalidação total
    invalidateAll,

    // Senso Populacional
    invalidateQuestionarios,
    invalidateResumoSensoData,
    invalidateParticipantesData,
    invalidateAnaliseSensoData,
    invalidateRelatorioSensoData,

    // BigFive
    invalidateResumoBigFiveData,
    invalidateAnaliseBigFiveData,
  };
}

export type CacheInvalidationHook = ReturnType<typeof useInvalidateDashboardCache>;
