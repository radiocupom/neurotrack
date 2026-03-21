"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  listarQuestionariosSensoAction,
  obterRelatorioSensoAction,
  obterParticipantesSensoAction,
  obterResumoSensoAction,
} from "@/app/dashboardsenso/dashboard-actions";
import {
  type DashboardFilters,
} from "@/service/dashboard-filters";
import type {
  DashboardAnaliseIa,
  DashboardQuestionarioSenso,
  DashboardSensoParticipantes,
  DashboardSensoResumo,
} from "@/app/dashboardsenso/dashboard-types";

type LoadState = "idle" | "loading" | "success" | "error";

function normalizeQuestionarios(payload: unknown): DashboardQuestionarioSenso[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const normalized: DashboardQuestionarioSenso[] = [];

  payload.forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }

      const raw = item as Record<string, unknown>;
      if (typeof raw.id !== "string" || typeof raw.titulo !== "string") {
        return;
      }

      normalized.push({
        id: raw.id,
        slug: typeof raw.slug === "string" ? raw.slug : undefined,
        titulo: raw.titulo,
        descricao: typeof raw.descricao === "string" ? raw.descricao : null,
        ativo: typeof raw.ativo === "boolean" ? raw.ativo : true,
        criadoEm: typeof raw.criadoEm === "string" ? raw.criadoEm : undefined,
      });
    });

  return normalized;
}

function normalizeResumo(payload: unknown, questionarioId: string): DashboardSensoResumo {
  const raw = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const resultadoRaw = Array.isArray(raw.resultado) ? raw.resultado : [];

  return {
    id: typeof raw.id === "string" ? raw.id : questionarioId,
    titulo: typeof raw.titulo === "string" ? raw.titulo : "Senso Populacional",
    descricao: typeof raw.descricao === "string" ? raw.descricao : null,
    totalRespostasFiltradas:
      typeof raw.totalRespostasFiltradas === "number" ? raw.totalRespostasFiltradas : 0,
    filtrosAplicados:
      raw.filtrosAplicados && typeof raw.filtrosAplicados === "object"
        ? (raw.filtrosAplicados as DashboardFilters)
        : undefined,
    resultado: resultadoRaw.map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const opcoes = Array.isArray(row.opcoes) ? row.opcoes : [];

      return {
        id: typeof row.id === "string" ? row.id : String(Math.random()),
        codigo: typeof row.codigo === "string" ? row.codigo : undefined,
        texto: typeof row.texto === "string" ? row.texto : "Pergunta",
        opcoes: opcoes.map((opcao) => {
          const option = opcao && typeof opcao === "object" ? (opcao as Record<string, unknown>) : {};
          return {
            id: typeof option.id === "string" ? option.id : String(Math.random()),
            codigo: typeof option.codigo === "string" ? option.codigo : undefined,
            texto: typeof option.texto === "string" ? option.texto : "Opcao",
            total: typeof option.total === "number" ? option.total : 0,
          };
        }),
      };
    }),
  };
}

function normalizeParticipantes(payload: unknown, questionarioId: string): DashboardSensoParticipantes {
  const raw = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  return {
    questionarioId: typeof raw.questionarioId === "string" ? raw.questionarioId : questionarioId,
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
    respostas: Array.isArray(raw.respostas) ? (raw.respostas as DashboardSensoParticipantes["respostas"]) : [],
  };
}

function normalizeAnalise(payload: unknown): DashboardAnaliseIa {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  return payload as DashboardAnaliseIa;
}

export function useSensoDashboard(filters: DashboardFilters) {
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState("");

  const [questionarios, setQuestionarios] = useState<DashboardQuestionarioSenso[]>([]);
  const [questionarioId, setQuestionarioId] = useState("");
  const [resumo, setResumo] = useState<DashboardSensoResumo | null>(null);
  const [participantes, setParticipantes] = useState<DashboardSensoParticipantes | null>(null);
  const [analiseIa, setAnaliseIa] = useState<DashboardAnaliseIa | null>(null);

  const canLoad = Boolean(questionarioId);

  const loadQuestionarios = useCallback(async () => {
    const result = await listarQuestionariosSensoAction();
    if (!result.ok) {
      throw new Error(result.message || "Falha ao carregar questionarios do dashboard.");
    }

    const normalized = normalizeQuestionarios(result.data);
    setQuestionarios(normalized);

    if (!questionarioId && normalized.length > 0) {
      setQuestionarioId(normalized[0].id);
    }
  }, [questionarioId]);

  const refetch = useCallback(async () => {
    if (!questionarioId) {
      return;
    }

    setState("loading");
    setError("");

    try {
      const [resumoResult, participantesResult] = await Promise.all([
        obterResumoSensoAction(questionarioId, filters),
        obterParticipantesSensoAction(questionarioId, filters),
      ]);

      if (!resumoResult.ok) throw new Error(resumoResult.message || "Falha ao carregar resumo de senso.");
      if (!participantesResult.ok) throw new Error(participantesResult.message || "Falha ao carregar participantes de senso.");

      setResumo(normalizeResumo(resumoResult.data, questionarioId));
      setParticipantes(normalizeParticipantes(participantesResult.data, questionarioId));
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar dashboard de senso.");
      setState("error");
    }
  }, [filters, questionarioId]);

  const refetchAnaliseIa = useCallback(async () => {
    if (!questionarioId) {
      return;
    }

    const result = await obterRelatorioSensoAction(questionarioId, filters);
    if (!result.ok) {
      throw new Error(result.message || "Falha ao carregar relatorio IA de senso.");
    }

    setAnaliseIa(normalizeAnalise(result.data));
  }, [filters, questionarioId]);

  useEffect(() => {
    void loadQuestionarios().catch((err) => {
      setState("error");
      setError(err instanceof Error ? err.message : "Falha ao carregar questionarios.");
    });
  }, [loadQuestionarios]);

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
    questionarios,
    questionarioId,
    setQuestionarioId,
    resumo,
    participantes,
    analiseIa,
    hasData,
    refetch,
    refetchAnaliseIa,
  };
}
