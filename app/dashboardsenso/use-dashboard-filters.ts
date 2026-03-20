"use client";

import { useMemo, useState } from "react";

import type { DashboardFilters } from "@/service/dashboard-workflow.service";
import { serializeDashboardFilters } from "@/service/dashboard-workflow.service";

export type DashboardModulo = "senso" | "bigfive" | "opiniao";

const SENSO_DEFAULT_FILTERS: DashboardFilters = {
  limit: 20,
  offset: 0,
};

const BIGFIVE_DEFAULT_FILTERS: DashboardFilters = {
  limit: 20,
  offset: 0,
};

const OPINIAO_DEFAULT_FILTERS: DashboardFilters = {
  limit: 20,
  offset: 0,
};

export function useDashboardFilters() {
  const [sensoFilters, setSensoFilters] = useState<DashboardFilters>(SENSO_DEFAULT_FILTERS);
  const [bigFiveFilters, setBigFiveFilters] = useState<DashboardFilters>(BIGFIVE_DEFAULT_FILTERS);
  const [opiniaoFilters, setOpiniaoFilters] = useState<DashboardFilters>(OPINIAO_DEFAULT_FILTERS);

  const serializedSenso = useMemo(() => serializeDashboardFilters(sensoFilters), [sensoFilters]);
  const serializedBigFive = useMemo(() => serializeDashboardFilters(bigFiveFilters), [bigFiveFilters]);
  const serializedOpiniao = useMemo(() => serializeDashboardFilters(opiniaoFilters), [opiniaoFilters]);

  function clearFilters(modulo: DashboardModulo) {
    if (modulo === "senso") {
      setSensoFilters(SENSO_DEFAULT_FILTERS);
      return;
    }

    if (modulo === "opiniao") {
      setOpiniaoFilters(OPINIAO_DEFAULT_FILTERS);
      return;
    }

    setBigFiveFilters(BIGFIVE_DEFAULT_FILTERS);
  }

  function patchFilters(modulo: DashboardModulo, patch: DashboardFilters) {
    if (modulo === "senso") {
      setSensoFilters((current) => ({ ...current, ...patch }));
      return;
    }

    if (modulo === "opiniao") {
      setOpiniaoFilters((current) => ({ ...current, ...patch }));
      return;
    }

    setBigFiveFilters((current) => ({ ...current, ...patch }));
  }

  return {
    sensoFilters,
    bigFiveFilters,
    opiniaoFilters,
    serializedSenso,
    serializedBigFive,
    serializedOpiniao,
    clearFilters,
    patchFilters,
  };
}
