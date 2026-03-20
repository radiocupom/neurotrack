"use client";

import { useCallback, useEffect, useState } from "react";

import { listarPesquisasIntencaoVotoAction } from "@/app/intencao-voto/workflow-actions";
import type { PesquisaIntencaoVoto } from "@/types/intencao-voto";

export function usePesquisasIntencaoVoto({ autoload = true }: { autoload?: boolean } = {}) {
  const [pesquisas, setPesquisas] = useState<PesquisaIntencaoVoto[]>([]);
  const [loading, setLoading] = useState(autoload);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await listarPesquisasIntencaoVotoAction();
      if (!result.ok) {
        setError(result.message || "Erro ao carregar pesquisas.");
        return;
      }

      setPesquisas(Array.isArray(result.data) ? result.data : []);
    } catch {
      setError("Erro inesperado ao carregar pesquisas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoload) {
      void refetch();
    }
  }, [autoload, refetch]);

  return { pesquisas, loading, error, refetch };
}
