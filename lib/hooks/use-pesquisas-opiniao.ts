/**
 * Hook para Listar Pesquisas de Opinião
 * Usado no modo privado
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { listarPesquisasOpiniao } from "@/app/pesquisa-opiniao/workflow-actions";
import type { PesquisaOpiniao } from "@/types/pesquisa-opiniao";

interface UsePesquisasOpiniaoParams {
  autoload?: boolean;
}

interface UsePesquisasOpiniaoState {
  pesquisas: PesquisaOpiniao[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePesquisasOpiniao({
  autoload = true,
}: UsePesquisasOpiniaoParams): UsePesquisasOpiniaoState {
  const [pesquisas, setPesquisas] = useState<PesquisaOpiniao[]>([]);
  const [loading, setLoading] = useState(autoload);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const resultado = await listarPesquisasOpiniao();

      if (!resultado.ok) {
        setError(resultado.message || "Erro ao carregar pesquisas.");
        return;
      }

      setPesquisas(Array.isArray(resultado.data) ? resultado.data : []);
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

  return {
    pesquisas,
    loading,
    error,
    refetch,
  };
}
