"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  obterRelatorioBigFiveAction,
  obterResumoBigFiveAction,
} from "@/app/dashboardsenso/dashboard-actions";
import {
  type DashboardFilters,
} from "@/service/dashboard-filters";
import type { DashboardAnaliseIa, DashboardBigFiveResumo } from "@/app/dashboardsenso/dashboard-types";

type LoadState = "idle" | "loading" | "success" | "error";

function normalizeResumo(payload: unknown): DashboardBigFiveResumo {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  return payload as DashboardBigFiveResumo;
}

function normalizeAnalise(payload: unknown): DashboardAnaliseIa {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  return payload as DashboardAnaliseIa;
}

export function useBigFiveDashboard(filters: DashboardFilters) {
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const [resumo, setResumo] = useState<DashboardBigFiveResumo | null>(null);
  const [analiseIa, setAnaliseIa] = useState<DashboardAnaliseIa | null>(null);

  const refetch = useCallback(async () => {
    setState("loading");
    setError("");

    try {
      const resumoResult = await obterResumoBigFiveAction(filters);

      if (!resumoResult.ok) throw new Error(resumoResult.message || "Falha ao carregar dashboard Big Five.");

      setResumo(normalizeResumo(resumoResult.data));
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar dashboard Big Five.");
      setState("error");
    }
  }, [filters]);

  const refetchAnaliseIa = useCallback(async () => {
    const result = await obterRelatorioBigFiveAction(filters);
    if (!result.ok) {
      throw new Error(result.message || "Falha ao carregar relatorio IA Big Five.");
    }

    setAnaliseIa(normalizeAnalise(result.data));
  }, [filters]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const hasData = useMemo(() => Boolean(resumo), [resumo]);

  return {
    state,
    error,
    resumo,
    analiseIa,
    hasData,
    refetch,
    refetchAnaliseIa,
  };
}
