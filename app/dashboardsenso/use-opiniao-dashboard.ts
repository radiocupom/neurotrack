"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  listarPesquisasOpiniaoDashboardAction,
  obterParticipantesOpiniaoDashboardAction,
  obterResumoOpiniaoDashboardAction,
} from "@/app/dashboardsenso/opiniao-actions";
import type { DashboardFilters } from "@/service/dashboard-filters";
import type {
  DashboardOpiniaoParticipantes,
  DashboardOpiniaoResumo,
  DashboardPesquisaOpiniao,
} from "@/app/dashboardsenso/dashboard-types";

type LoadState = "idle" | "loading" | "success" | "error";

function asObject(payload: unknown) {
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
}

function normalizePesquisas(payload: unknown): DashboardPesquisaOpiniao[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const normalized: DashboardPesquisaOpiniao[] = [];

  payload.forEach((item) => {
    const raw = asObject(item);
    const id = typeof raw.id === "string" ? raw.id : "";
    const titulo = typeof raw.titulo === "string" ? raw.titulo : "";

    if (!id || !titulo) {
      return;
    }

    normalized.push({
      id,
      titulo,
      descricao: typeof raw.descricao === "string" ? raw.descricao : null,
      ativo: typeof raw.ativo === "boolean" ? raw.ativo : true,
      criadoEm: typeof raw.criadoEm === "string" ? raw.criadoEm : undefined,
    });
  });

  return normalized;
}

function normalizeResumo(payload: unknown, pesquisaId: string): DashboardOpiniaoResumo {
  const raw = asObject(payload);
  const resultadoRaw = Array.isArray(raw.resultado) ? raw.resultado : [];

  return {
    id: typeof raw.id === "string" ? raw.id : pesquisaId,
    titulo: typeof raw.titulo === "string" ? raw.titulo : "Pesquisa de Opiniao",
    descricao: typeof raw.descricao === "string" ? raw.descricao : null,
    totalRespostasFiltradas: typeof raw.totalRespostasFiltradas === "number" ? raw.totalRespostasFiltradas : 0,
    filtrosAplicados:
      raw.filtrosAplicados && typeof raw.filtrosAplicados === "object"
        ? (raw.filtrosAplicados as DashboardFilters)
        : undefined,
    resultado: resultadoRaw.map((item, idx) => {
      const row = asObject(item);
      const opcoesRaw = Array.isArray(row.opcoes) ? row.opcoes : [];

      return {
        id: typeof row.id === "string" ? row.id : `pergunta-${idx}`,
        texto: typeof row.texto === "string" ? row.texto : "Pergunta",
        opcoes: opcoesRaw.map((opcao, opIdx) => {
          const option = asObject(opcao);
          return {
            id: typeof option.id === "string" ? option.id : `opcao-${idx}-${opIdx}`,
            texto: typeof option.texto === "string" ? option.texto : "Opcao",
            total: typeof option.total === "number" ? option.total : 0,
          };
        }),
      };
    }),
  };
}

function normalizeParticipantes(payload: unknown, pesquisaId: string): DashboardOpiniaoParticipantes {
  const raw = asObject(payload);
  const respostasRaw = Array.isArray(raw.respostas) ? raw.respostas : [];

  return {
    pesquisaId: typeof raw.pesquisaId === "string" ? raw.pesquisaId : pesquisaId,
    total: typeof raw.total === "number" ? raw.total : 0,
    totalFiltrado: typeof raw.totalFiltrado === "number" ? raw.totalFiltrado : 0,
    filtrosAplicados:
      raw.filtrosAplicados && typeof raw.filtrosAplicados === "object"
        ? (raw.filtrosAplicados as DashboardFilters)
        : undefined,
    paginacao:
      raw.paginacao && typeof raw.paginacao === "object"
        ? {
            limit: typeof (raw.paginacao as Record<string, unknown>).limit === "number" ? ((raw.paginacao as Record<string, unknown>).limit as number) : 20,
            offset: typeof (raw.paginacao as Record<string, unknown>).offset === "number" ? ((raw.paginacao as Record<string, unknown>).offset as number) : 0,
            temMais: Boolean((raw.paginacao as Record<string, unknown>).temMais),
          }
        : { limit: 20, offset: 0, temMais: false },
    respostas: respostasRaw.map((item, index) => {
      const row = asObject(item);
      return {
        id: typeof row.id === "string" ? row.id : `resposta-${index}`,
        respondidoEm: typeof row.respondidoEm === "string" ? row.respondidoEm : undefined,
        estado: typeof row.estado === "string" ? row.estado : null,
        cidade: typeof row.cidade === "string" ? row.cidade : null,
        bairro: typeof row.bairro === "string" ? row.bairro : null,
        participante:
          row.participante && typeof row.participante === "object"
            ? (row.participante as { id?: string; nome?: string | null; contatoOpcional?: string | null })
            : undefined,
        entrevistador:
          row.entrevistador && typeof row.entrevistador === "object"
            ? (row.entrevistador as { id?: string; nome?: string | null; email?: string | null })
            : undefined,
      };
    }),
  };
}

export function useOpiniaoDashboard(filters: DashboardFilters) {
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState("");

  const [pesquisas, setPesquisas] = useState<DashboardPesquisaOpiniao[]>([]);
  const [pesquisaId, setPesquisaId] = useState("");
  const [resumo, setResumo] = useState<DashboardOpiniaoResumo | null>(null);
  const [participantes, setParticipantes] = useState<DashboardOpiniaoParticipantes | null>(null);

  const canLoad = Boolean(pesquisaId);

  const loadPesquisas = useCallback(async () => {
    const result = await listarPesquisasOpiniaoDashboardAction();
    if (!result.ok) {
      throw new Error(result.message || "Falha ao carregar pesquisas de opiniao do dashboard.");
    }

    const normalized = normalizePesquisas(result.data);
    setPesquisas(normalized);

    if (!pesquisaId && normalized.length > 0) {
      setPesquisaId(normalized[0].id);
    }
  }, [pesquisaId]);

  const refetch = useCallback(async () => {
    if (!pesquisaId) {
      return;
    }

    setState("loading");
    setError("");

    try {
      const [resumoResult, participantesResult] = await Promise.all([
        obterResumoOpiniaoDashboardAction(pesquisaId, filters),
        obterParticipantesOpiniaoDashboardAction(pesquisaId, filters),
      ]);

      console.log("[use-opiniao-dashboard] resumoResult ->", resumoResult);
      console.log("[use-opiniao-dashboard] participantesResult ->", participantesResult);

      if (!resumoResult.ok) {
        throw new Error(resumoResult.message || "Falha ao carregar resumo de opiniao.");
      }

      if (!participantesResult.ok) {
        throw new Error(participantesResult.message || "Falha ao carregar participantes de opiniao.");
      }

      setResumo(normalizeResumo(resumoResult.data, pesquisaId));
      setParticipantes(normalizeParticipantes(participantesResult.data, pesquisaId));
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar dashboard de opiniao.");
      setState("error");
    }
  }, [filters, pesquisaId]);

  useEffect(() => {
    void loadPesquisas().catch((err) => {
      setState("error");
      setError(err instanceof Error ? err.message : "Falha ao carregar pesquisas de opiniao.");
    });
  }, [loadPesquisas]);

  useEffect(() => {
    if (!canLoad) {
      return;
    }

    void refetch();
  }, [canLoad, refetch]);

  const hasData = useMemo(() => Boolean(resumo && participantes), [resumo, participantes]);

  return {
    state,
    error,
    pesquisas,
    pesquisaId,
    setPesquisaId,
    resumo,
    participantes,
    hasData,
    refetch,
  };
}
