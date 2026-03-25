"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/lib/auth/types";
import { useDashboardRealtime } from "@/app/dashboardsenso/use-dashboard-realtime";
import {
  obterAuditoriaEntrevistadoresDashboardAction,
  obterPesquisasEntrevistadorDashboardAction,
} from "@/app/dashboardsenso/dashboard-actions";
import type {
  DashboardAuditoriaEntrevistadorDetalhes,
  DashboardAuditoriaEntrevistadoresResponse,
  DashboardAuditoriaEntrevistadorItem,
  DashboardAuditoriaRegistroEntrevistador,
} from "@/app/dashboardsenso/dashboard-types";
import type { DashboardFilters } from "@/service/dashboard-filters";

const TIPOS_PESQUISA = ["INTENCAO", "OPINIAO", "SENSO", "BIGFIVE"] as const;
const CANAIS_PESQUISA = ["WHATSAPP", "PRESENCIAL", "TELEFONE", "OUTRO"] as const;

type TipoPesquisa = (typeof TIPOS_PESQUISA)[number];
type CanalPesquisa = (typeof CANAIS_PESQUISA)[number];

type FiltrosEntrevistador = {
  entrevistadorId: string;
  pesquisaId: string;
  campanhaId: string;
  participanteId: string;
  nome: string;
  respondidoDe: string;
  respondidoAte: string;
  tipoPesquisa: TipoPesquisa[];
  canal: CanalPesquisa[];
  limit: number;
  offset: number;
};

type PaginacaoDetalhe = {
  limit: number;
  offset: number;
};

type PeriodoPreset = "custom" | "hoje" | "7dias" | "30dias";

function emptyFiltros(): FiltrosEntrevistador {
  return {
    entrevistadorId: "",
    pesquisaId: "",
    campanhaId: "",
    participanteId: "",
    nome: "",
    respondidoDe: "",
    respondidoAte: "",
    tipoPesquisa: [],
    canal: [],
    limit: 10,
    offset: 0,
  };
}

function emptyPaginacaoDetalhe(): PaginacaoDetalhe {
  return { limit: 10, offset: 0 };
}

function asObject(payload: unknown) {
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
}

function readNumber(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function parseCsvList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildPeriodoPresetRange(preset: Exclude<PeriodoPreset, "custom">) {
  const today = new Date();
  const end = new Date(today);
  const start = new Date(today);

  if (preset === "7dias") {
    start.setDate(start.getDate() - 6);
  }

  if (preset === "30dias") {
    start.setDate(start.getDate() - 29);
  }

  return {
    respondidoDe: toInputDate(start),
    respondidoAte: toInputDate(end),
  };
}

function buildBaseFilters(filters: FiltrosEntrevistador): DashboardFilters {
  const query: DashboardFilters = {};

  const entrevistadorIds = parseCsvList(filters.entrevistadorId);
  const pesquisaIds = parseCsvList(filters.pesquisaId);
  const campanhaIds = parseCsvList(filters.campanhaId);
  const participanteIds = parseCsvList(filters.participanteId);

  if (entrevistadorIds.length) query.entrevistadorId = entrevistadorIds;
  if (pesquisaIds.length) query.pesquisaId = pesquisaIds;
  if (campanhaIds.length) query.campanhaId = campanhaIds;
  if (participanteIds.length) query.participanteId = participanteIds;
  if (filters.tipoPesquisa.length) query.tipoPesquisa = filters.tipoPesquisa;
  if (filters.canal.length) query.canal = filters.canal;
  if (filters.nome.trim()) query.nome = filters.nome.trim();
  if (filters.respondidoDe) query.respondidoDe = filters.respondidoDe;
  if (filters.respondidoAte) query.respondidoAte = filters.respondidoAte;

  return query;
}

function normalizeLista(payload: unknown): DashboardAuditoriaEntrevistadoresResponse {
  const raw = asObject(payload);
  const resumoRaw = asObject(raw.resumo);
  const entrevistadoresRaw = Array.isArray(raw.entrevistadores) ? raw.entrevistadores : [];

  const entrevistadores: DashboardAuditoriaEntrevistadorItem[] = entrevistadoresRaw.map((item, index) => {
    const row = asObject(item);
    const entrevistador = asObject(row.entrevistador);
    const totais = asObject(row.totais);

    return {
      entrevistador: {
        id: readString(entrevistador.id) || `entrevistador-${index}`,
        nome: readString(entrevistador.nome) || "Sem nome",
        email: readString(entrevistador.email) || null,
        ativo: typeof entrevistador.ativo === "boolean" ? entrevistador.ativo : true,
        papel: readString(entrevistador.papel) || null,
        criadoEm: readString(entrevistador.criadoEm) || null,
      },
      totais: {
        opiniao: readNumber(totais.opiniao),
        senso: readNumber(totais.senso),
        bigfive: readNumber(totais.bigfive),
        intencao: readNumber(totais.intencao),
        totalGeral: readNumber(totais.totalGeral),
      },
    };
  });

  return {
    filtrosAplicados: raw.filtrosAplicados && typeof raw.filtrosAplicados === "object"
      ? (raw.filtrosAplicados as DashboardFilters)
      : undefined,
    resumo: {
      totalEntrevistadores: readNumber(resumoRaw.totalEntrevistadores),
      totalOpiniao: readNumber(resumoRaw.totalOpiniao),
      totalSenso: readNumber(resumoRaw.totalSenso),
      totalBigFive: readNumber(resumoRaw.totalBigFive),
      totalIntencao: readNumber(resumoRaw.totalIntencao),
      totalGeral: readNumber(resumoRaw.totalGeral),
    },
    entrevistadores,
  };
}

function normalizeDetalhes(payload: unknown): DashboardAuditoriaEntrevistadorDetalhes {
  const raw = asObject(payload);
  const entrevistadorRaw = asObject(raw.entrevistador);
  const totaisRaw = asObject(raw.totais);
  const resumoRaw = Object.keys(totaisRaw).length > 0 ? totaisRaw : asObject(raw.resumo);
  const paginacaoRaw = asObject(raw.paginacao);
  const registrosRaw = Array.isArray(raw.registros) ? raw.registros : [];

  const registros: DashboardAuditoriaRegistroEntrevistador[] = registrosRaw.map((item, index) => {
    const row = asObject(item);
    const participante = asObject(row.participante);
    const pesquisa = asObject(row.pesquisa);
    const campanha = asObject(row.campanha);
    const questionario = asObject(row.questionario);
    const candidato = asObject(row.candidato);
    const localizacao = asObject(row.localizacao);
    const respostasRaw = Array.isArray(row.respostas) ? row.respostas : [];
    const respostasObjeto = row.respostas && typeof row.respostas === "object" && !Array.isArray(row.respostas)
      ? (row.respostas as Record<string, string | number | null>)
      : null;

    return {
      tipoPesquisa: readString(row.tipoPesquisa) || "INTENCAO",
      registroId: readString(row.registroId) || `registro-${index}`,
      respondidoEm: readString(row.respondidoEm) || undefined,
      participante: {
        id: readString(participante.id) || undefined,
        nome: readString(participante.nome) || null,
      },
      pesquisa: {
        id: readString(pesquisa.id) || undefined,
        titulo: readString(pesquisa.titulo) || null,
        cargo: readString(pesquisa.cargo) || null,
      },
      campanha: {
        id: readString(campanha.id) || undefined,
        nome: readString(campanha.nome) || null,
      },
      questionario: {
        id: readString(questionario.id) || undefined,
        titulo: readString(questionario.titulo) || null,
      },
      candidato: {
        id: readString(candidato.id) || undefined,
        nome: readString(candidato.nome) || null,
        partido: readString(candidato.partido) || null,
        fotoUrl: readNullableString(candidato.fotoUrl),
      },
      canal: readNullableString(row.canal),
      idade: typeof row.idade === "number" ? row.idade : null,
      telefone: readNullableString(row.telefone),
      localizacao: {
        estado: readString(localizacao.estado) || null,
        cidade: readString(localizacao.cidade) || null,
        bairro: readString(localizacao.bairro) || null,
        latitude: typeof localizacao.latitude === "number" ? localizacao.latitude : null,
        longitude: typeof localizacao.longitude === "number" ? localizacao.longitude : null,
      },
      classificacao: readNullableString(row.classificacao),
      interpretacao: readNullableString(row.interpretacao),
      ip: readString(row.ip) || null,
      respostas: respostasObjeto ?? respostasRaw.map((resposta) => {
        const respostaRow = asObject(resposta);
        const pergunta = asObject(respostaRow.pergunta);
        const respostaData = asObject(respostaRow.resposta);

        return {
          pergunta: {
            id: readString(pergunta.id) || undefined,
            texto: readString(pergunta.texto) || null,
          },
          resposta: {
            id: readString(respostaData.id) || undefined,
            texto: readString(respostaData.texto) || null,
          },
        };
      }),
    };
  });

  return {
    entrevistador: {
      id: readString(entrevistadorRaw.id) || undefined,
      nome: readString(entrevistadorRaw.nome) || null,
      email: readString(entrevistadorRaw.email) || null,
    },
    filtrosAplicados: raw.filtrosAplicados && typeof raw.filtrosAplicados === "object"
      ? (raw.filtrosAplicados as DashboardFilters)
      : undefined,
    resumo: {
      totalOpiniao: readNumber(resumoRaw.totalOpiniao),
      totalSenso: readNumber(resumoRaw.totalSenso),
      totalBigFive: readNumber(resumoRaw.totalBigFive),
      totalIntencao: readNumber(resumoRaw.totalIntencao),
      totalGeral: readNumber(resumoRaw.totalGeral),
      totalFiltrado: readNumber(resumoRaw.totalFiltrado),
    },
    paginacao: {
      totalFiltrado: readNumber(paginacaoRaw.totalFiltrado),
      limit: readNumber(paginacaoRaw.limit) || 10,
      offset: readNumber(paginacaoRaw.offset),
      temMais: Boolean(paginacaoRaw.temMais),
    },
    registros,
  };
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function formatDetalheRegistro(registro: DashboardAuditoriaRegistroEntrevistador) {
  if (registro.tipoPesquisa === "INTENCAO") {
    const nome = registro.candidato?.nome || "-";
    const partido = registro.candidato?.partido ? ` (${registro.candidato.partido})` : "";
    return `${nome}${partido}`;
  }

  if (registro.tipoPesquisa === "BIGFIVE") {
    if (registro.classificacao) {
      return registro.classificacao;
    }

    if (registro.interpretacao) {
      return registro.interpretacao;
    }

    if (registro.respostas && !Array.isArray(registro.respostas)) {
      const respostasObjeto = registro.respostas as Record<string, string | number | null>;
      const keys = Object.keys(respostasObjeto);
      if (keys.length) {
        return keys.map((k) => `${k}: ${String(respostasObjeto[k] ?? "-")}`).join(" | ");
      }
    }
  }

  if (Array.isArray(registro.respostas)) {
    return registro.respostas[0]?.resposta?.texto || "-";
  }

  return "-";
}

export type DashboardEntrevistadoresProps = {
  loggedUser: AuthUser;
};

export function DashboardEntrevistadores({ loggedUser }: DashboardEntrevistadoresProps) {
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [filtros, setFiltros] = useState<FiltrosEntrevistador>(emptyFiltros());
  const [paginacaoDetalhe, setPaginacaoDetalhe] = useState<PaginacaoDetalhe>(emptyPaginacaoDetalhe());
  const [periodoPreset, setPeriodoPreset] = useState<PeriodoPreset>("custom");

  const [lista, setLista] = useState<DashboardAuditoriaEntrevistadoresResponse | null>(null);
  const [detalhes, setDetalhes] = useState<DashboardAuditoriaEntrevistadorDetalhes | null>(null);

  const [selectedEntrevistadorId, setSelectedEntrevistadorId] = useState("");

  const [loadingLista, setLoadingLista] = useState(false);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [errorLista, setErrorLista] = useState("");
  const [errorDetalhes, setErrorDetalhes] = useState("");

  const { isConnected } = useDashboardRealtime({
    onDashboardUpdate: (module) => {
      if (!module || module === "entrevistadores" || module === "auditoria" || module === "auditoria-entrevistadores") {
        setRefreshSeed((seed) => seed + 1);
      }
    },
    onBigFiveRespostaRegistrada: () => {},
    onOpiniaoRespostaRegistrada: () => {},
  });

  const totalFiltros = useMemo(() => {
    return Object.values(buildBaseFilters(filtros)).filter((value) => {
      if (Array.isArray(value)) return value.length > 0;
      return value != null && String(value).trim() !== "";
    }).length;
  }, [filtros]);

  const totalEntrevistadoresLista = lista?.resumo.totalEntrevistadores ?? 0;
  const totalPaginasLista = Math.max(1, Math.ceil(totalEntrevistadoresLista / filtros.limit));
  const paginaAtualLista = Math.min(totalPaginasLista, Math.floor(filtros.offset / filtros.limit) + 1);
  const hasPrevLista = filtros.offset > 0;
  const hasNextLista = filtros.offset + (lista?.entrevistadores.length ?? 0) < totalEntrevistadoresLista;

  const chartData = useMemo(() => {
    return (lista?.entrevistadores ?? []).map((item) => ({
      nome: item.entrevistador.nome,
      total: item.totais.totalGeral,
    }));
  }, [lista]);

  const entrevistadorOptions = useMemo(() => {
    return (lista?.entrevistadores ?? []).map((item) => ({
      id: item.entrevistador.id,
      label: `${item.entrevistador.nome} (${item.entrevistador.id})`,
    }));
  }, [lista]);

  const pesquisaOptions = useMemo(() => {
    const map = new Map<string, string>();

    (detalhes?.registros ?? []).forEach((registro) => {
      if (!registro.pesquisa?.id) return;
      const label = registro.pesquisa?.titulo
        ? `${registro.pesquisa.titulo} (${registro.pesquisa.id})`
        : registro.pesquisa.id;
      map.set(registro.pesquisa.id, label);
    });

    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [detalhes]);

  const participanteOptions = useMemo(() => {
    const map = new Map<string, string>();

    (detalhes?.registros ?? []).forEach((registro) => {
      if (!registro.participante?.id) return;
      const label = registro.participante?.nome
        ? `${registro.participante.nome} (${registro.participante.id})`
        : registro.participante.id;
      map.set(registro.participante.id, label);
    });

    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [detalhes]);

  const toggleTipoPesquisa = useCallback((tipo: TipoPesquisa) => {
    setFiltros((prev) => {
      const exists = prev.tipoPesquisa.includes(tipo);
      return {
        ...prev,
        tipoPesquisa: exists ? prev.tipoPesquisa.filter((item) => item !== tipo) : [...prev.tipoPesquisa, tipo],
        offset: 0,
      };
    });
  }, []);

  const toggleCanal = useCallback((canal: CanalPesquisa) => {
    setFiltros((prev) => {
      const exists = prev.canal.includes(canal);
      return {
        ...prev,
        canal: exists ? prev.canal.filter((item) => item !== canal) : [...prev.canal, canal],
        offset: 0,
      };
    });
  }, []);

  const clearFiltros = useCallback(() => {
    setFiltros(emptyFiltros());
    setPaginacaoDetalhe(emptyPaginacaoDetalhe());
    setPeriodoPreset("custom");
  }, []);

  const applyPeriodoPreset = useCallback((preset: Exclude<PeriodoPreset, "custom">) => {
    const range = buildPeriodoPresetRange(preset);
    setPeriodoPreset(preset);
    setFiltros((prev) => ({
      ...prev,
      respondidoDe: range.respondidoDe,
      respondidoAte: range.respondidoAte,
      offset: 0,
    }));
  }, []);

  const refetchLista = useCallback(async () => {
    setLoadingLista(true);
    setErrorLista("");

    const query: DashboardFilters = {
      ...buildBaseFilters(filtros),
      limit: filtros.limit,
      offset: filtros.offset,
    };

    const result = await obterAuditoriaEntrevistadoresDashboardAction(query);

    if (!result.ok || !result.data) {
      setLoadingLista(false);
      setErrorLista(result.message || "Falha ao carregar auditoria de entrevistadores.");
      return;
    }

    const normalized = normalizeLista(result.data);
    setLista(normalized);
    setLoadingLista(false);

    if (!selectedEntrevistadorId && normalized.entrevistadores.length > 0) {
      setSelectedEntrevistadorId(normalized.entrevistadores[0].entrevistador.id);
      return;
    }

    const exists = normalized.entrevistadores.some((item) => item.entrevistador.id === selectedEntrevistadorId);
    if (!exists && normalized.entrevistadores.length > 0) {
      setSelectedEntrevistadorId(normalized.entrevistadores[0].entrevistador.id);
    }
  }, [filtros, selectedEntrevistadorId]);

  const refetchDetalhes = useCallback(async () => {
    if (!selectedEntrevistadorId) {
      setDetalhes(null);
      return;
    }

    setLoadingDetalhes(true);
    setErrorDetalhes("");

    const query: DashboardFilters = {
      ...buildBaseFilters(filtros),
      limit: paginacaoDetalhe.limit,
      offset: paginacaoDetalhe.offset,
    };

    const result = await obterPesquisasEntrevistadorDashboardAction(selectedEntrevistadorId, query);

    if (!result.ok || !result.data) {
      setLoadingDetalhes(false);
      setErrorDetalhes(result.message || "Falha ao carregar detalhes do entrevistador.");
      return;
    }

    setDetalhes(normalizeDetalhes(result.data));
    setLoadingDetalhes(false);
  }, [filtros, paginacaoDetalhe.limit, paginacaoDetalhe.offset, selectedEntrevistadorId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetchLista();
  }, [refetchLista, refreshSeed]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetchDetalhes();
  }, [refetchDetalhes, refreshSeed]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaginacaoDetalhe((prev) => ({ ...prev, offset: 0 }));
  }, [selectedEntrevistadorId]);

  return (
    <section className="flex min-w-0 flex-1 flex-col p-3 sm:p-6 lg:p-8">
      <div className="min-w-0 rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(8,15,31,0.88),rgba(15,23,42,0.78))] p-4 shadow-2xl shadow-slate-950/40 sm:p-6">
        <header className="border-b border-white/10 pb-6">
          <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200">
            Dashboard Inteligente
          </div>
          <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">Auditoria de Entrevistadores</h2>
          <p className="mt-2 text-sm text-slate-300">Ranking de entrevistadores e trilha detalhada das respostas por pesquisa.</p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <p className="text-xs text-slate-400">Perfil logado: {loggedUser.nome} ({loggedUser.papel})</p>
            <span
              title={isConnected ? "Tempo real ativo" : "Sem conexao em tempo real"}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                isConnected
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : "border-slate-600/40 bg-slate-800/40 text-slate-400",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-1.5 w-1.5 rounded-full",
                  isConnected ? "bg-emerald-400" : "bg-slate-500",
                ].join(" ")}
              />
              {isConnected ? "Tempo real" : "Offline"}
            </span>
          </div>
        </header>

        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white">Filtros de auditoria</h3>
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300">
              {totalFiltros} ativos
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <label className="block text-sm text-slate-300">
              <span className="mb-1 block">Nome</span>
              <input
                value={filtros.nome}
                onChange={(event) => setFiltros((prev) => ({ ...prev, nome: event.target.value, offset: 0 }))}
                className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                placeholder="Joao"
              />
            </label>

            <label className="block text-sm text-slate-300">
              <span className="mb-1 block">Entrevistador</span>
              <select
                value={filtros.entrevistadorId}
                onChange={(event) => {
                  const value = event.target.value;
                  setFiltros((prev) => ({ ...prev, entrevistadorId: value, offset: 0 }));
                  if (value) setSelectedEntrevistadorId(value);
                }}
                className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
              >
                <option value="">Todos</option>
                {entrevistadorOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-slate-300">
              <span className="mb-1 block">Pesquisa</span>
              <select
                value={filtros.pesquisaId}
                onChange={(event) => setFiltros((prev) => ({ ...prev, pesquisaId: event.target.value, offset: 0 }))}
                className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
              >
                <option value="">Todas</option>
                {pesquisaOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-slate-300">
              <span className="mb-1 block">Campanha ID (csv)</span>
              <input
                value={filtros.campanhaId}
                onChange={(event) => setFiltros((prev) => ({ ...prev, campanhaId: event.target.value, offset: 0 }))}
                className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                placeholder="uuid"
              />
            </label>

            <label className="block text-sm text-slate-300">
              <span className="mb-1 block">Participante</span>
              <select
                value={filtros.participanteId}
                onChange={(event) => setFiltros((prev) => ({ ...prev, participanteId: event.target.value, offset: 0 }))}
                className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
              >
                <option value="">Todos</option>
                {participanteOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-slate-300">
              <span className="mb-1 block">Respondido de</span>
              <input
                type="date"
                value={filtros.respondidoDe}
                onChange={(event) => {
                  setPeriodoPreset("custom");
                  setFiltros((prev) => ({ ...prev, respondidoDe: event.target.value, offset: 0 }));
                }}
                className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
              />
            </label>

            <label className="block text-sm text-slate-300">
              <span className="mb-1 block">Respondido ate</span>
              <input
                type="date"
                value={filtros.respondidoAte}
                onChange={(event) => {
                  setPeriodoPreset("custom");
                  setFiltros((prev) => ({ ...prev, respondidoAte: event.target.value, offset: 0 }));
                }}
                className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPeriodoPreset("hoje")}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                periodoPreset === "hoje"
                  ? "border-violet-400/40 bg-violet-400/15 text-violet-200"
                  : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10",
              ].join(" ")}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => applyPeriodoPreset("7dias")}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                periodoPreset === "7dias"
                  ? "border-violet-400/40 bg-violet-400/15 text-violet-200"
                  : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10",
              ].join(" ")}
            >
              Ultimos 7 dias
            </button>
            <button
              type="button"
              onClick={() => applyPeriodoPreset("30dias")}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                periodoPreset === "30dias"
                  ? "border-violet-400/40 bg-violet-400/15 text-violet-200"
                  : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10",
              ].join(" ")}
            >
              Ultimos 30 dias
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            {TIPOS_PESQUISA.map((tipo) => {
              const active = filtros.tipoPesquisa.includes(tipo);
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => toggleTipoPesquisa(tipo)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    active
                      ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-200"
                      : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10",
                  ].join(" ")}
                >
                  {tipo}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            {CANAIS_PESQUISA.map((canal) => {
              const active = filtros.canal.includes(canal);
              return (
                <button
                  key={canal}
                  type="button"
                  onClick={() => toggleCanal(canal)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    active
                      ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                      : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10",
                  ].join(" ")}
                >
                  {canal}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => setRefreshSeed((seed) => seed + 1)} className="bg-cyan-500 text-slate-950">
              Atualizar
            </Button>
            <Button type="button" onClick={clearFiltros} className="border border-white/20 bg-white/5 text-slate-200">
              Limpar filtros
            </Button>
          </div>
        </div>

        {loadingLista ? <StateBox text="Carregando auditoria de entrevistadores..." /> : null}
        {errorLista ? <StateBox text={errorLista} tone="error" /> : null}

        {lista ? (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <KpiCard label="Entrevistadores" value={String(lista.resumo.totalEntrevistadores)} />
              <KpiCard label="Total geral" value={String(lista.resumo.totalGeral)} />
              <KpiCard label="Intencao" value={String(lista.resumo.totalIntencao)} />
              <KpiCard label="Opiniao" value={String(lista.resumo.totalOpiniao)} />
              <KpiCard label="Senso" value={String(lista.resumo.totalSenso)} />
              <KpiCard label="Big Five" value={String(lista.resumo.totalBigFive)} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-bold text-white">Ranking de entrevistadores</h3>
              <div className="mt-4 min-w-0 w-full">
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 36 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="nome" stroke="#94a3b8" angle={-15} textAnchor="end" interval={0} height={56} tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(56,189,248,0.12)" }}
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(148,163,184,0.35)", borderRadius: 10, color: "#e2e8f0" }}
                      formatter={(value) => [`${Number(value ?? 0)} resposta(s)`, "Total"]}
                    />
                    <Bar dataKey="total" fill="#22d3ee" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-white">Lista de entrevistadores</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span>Pagina {paginaAtualLista} de {totalPaginasLista}</span>
                  <span>•</span>
                  <span>{totalEntrevistadoresLista} entrevistador(es)</span>
                  <label className="ml-2 inline-flex items-center gap-2">
                    <span>Itens</span>
                    <select
                      value={String(filtros.limit)}
                      onChange={(event) => {
                        const nextLimit = Number(event.target.value) || 10;
                        setFiltros((prev) => ({ ...prev, limit: nextLimit, offset: 0 }));
                      }}
                      className="h-8 rounded-lg border border-white/15 bg-slate-950/65 px-2 text-xs text-slate-100"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm text-slate-200">
                  <thead className="border-b border-white/10 text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-right">Opiniao</th>
                      <th className="px-3 py-2 text-right">Senso</th>
                      <th className="px-3 py-2 text-right">Big Five</th>
                      <th className="px-3 py-2 text-right">Intencao</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.entrevistadores.map((item) => {
                      const active = item.entrevistador.id === selectedEntrevistadorId;
                      return (
                        <tr
                          key={item.entrevistador.id}
                          onClick={() => setSelectedEntrevistadorId(item.entrevistador.id)}
                          className={[
                            "cursor-pointer border-b border-white/5",
                            active ? "bg-cyan-500/10" : "hover:bg-white/5",
                          ].join(" ")}
                        >
                          <td className="px-3 py-2 font-semibold">{item.entrevistador.nome}</td>
                          <td className="px-3 py-2 text-slate-400">{item.entrevistador.email || "-"}</td>
                          <td className="px-3 py-2 text-right">{item.totais.opiniao}</td>
                          <td className="px-3 py-2 text-right">{item.totais.senso}</td>
                          <td className="px-3 py-2 text-right">{item.totais.bigfive}</td>
                          <td className="px-3 py-2 text-right">{item.totais.intencao}</td>
                          <td className="px-3 py-2 text-right font-bold">{item.totais.totalGeral}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  onClick={() => setFiltros((prev) => ({ ...prev, offset: Math.max(prev.offset - prev.limit, 0) }))}
                  disabled={!hasPrevLista}
                  className="border border-white/20 bg-white/5 text-slate-200"
                >
                  Pagina anterior
                </Button>
                <Button
                  type="button"
                  onClick={() => setFiltros((prev) => ({ ...prev, offset: prev.offset + prev.limit }))}
                  disabled={!hasNextLista}
                  className="border border-white/20 bg-white/5 text-slate-200"
                >
                  Proxima pagina
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {selectedEntrevistadorId ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-white">Detalhes do entrevistador</h3>
              <span className="text-xs text-slate-400">Entrevistador ID: {selectedEntrevistadorId}</span>
            </div>

            {loadingDetalhes ? <StateBox text="Carregando detalhes do entrevistador..." /> : null}
            {errorDetalhes ? <StateBox text={errorDetalhes} tone="error" /> : null}

            {detalhes ? (
              <>
                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
                  <KpiCard label="Total geral" value={String(detalhes.resumo.totalGeral)} />
                  <KpiCard label="Intencao" value={String(detalhes.resumo.totalIntencao)} />
                  <KpiCard label="Opiniao" value={String(detalhes.resumo.totalOpiniao)} />
                  <KpiCard label="Senso" value={String(detalhes.resumo.totalSenso)} />
                  <KpiCard label="Big Five" value={String(detalhes.resumo.totalBigFive)} />
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm text-slate-200">
                    <thead className="border-b border-white/10 text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left">Tipo</th>
                        <th className="px-3 py-2 text-left">Respondido em</th>
                        <th className="px-3 py-2 text-left">Participante</th>
                        <th className="px-3 py-2 text-left">Pesquisa</th>
                        <th className="px-3 py-2 text-left">Campanha</th>
                        <th className="px-3 py-2 text-left">Questionario</th>
                        <th className="px-3 py-2 text-left">Detalhe</th>
                        <th className="px-3 py-2 text-left">Canal</th>
                        <th className="px-3 py-2 text-left">Idade</th>
                        <th className="px-3 py-2 text-left">Telefone</th>
                        <th className="px-3 py-2 text-left">Localizacao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalhes.registros.map((registro) => (
                        <tr key={registro.registroId} className="border-b border-white/5">
                          <td className="px-3 py-2 font-semibold">{registro.tipoPesquisa}</td>
                          <td className="px-3 py-2">{formatDate(registro.respondidoEm)}</td>
                          <td className="px-3 py-2">{registro.participante?.nome || "-"}</td>
                          <td className="px-3 py-2">{registro.pesquisa?.titulo || "-"}</td>
                          <td className="px-3 py-2">{registro.campanha?.nome || "-"}</td>
                          <td className="px-3 py-2">{registro.questionario?.titulo || "-"}</td>
                          <td className="px-3 py-2 text-slate-300">
                            {formatDetalheRegistro(registro)}
                          </td>
                          <td className="px-3 py-2">{registro.canal || "-"}</td>
                          <td className="px-3 py-2">{registro.idade ?? "-"}</td>
                          <td className="px-3 py-2">{registro.telefone || "-"}</td>
                          <td className="px-3 py-2">
                            {[
                              registro.localizacao?.estado,
                              registro.localizacao?.cidade,
                              registro.localizacao?.bairro,
                            ].filter(Boolean).join(" / ") || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    onClick={() => setPaginacaoDetalhe((prev) => ({ ...prev, offset: Math.max(prev.offset - prev.limit, 0) }))}
                    disabled={paginacaoDetalhe.offset <= 0}
                    className="border border-white/20 bg-white/5 text-slate-200"
                  >
                    Pagina anterior
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setPaginacaoDetalhe((prev) => ({ ...prev, offset: prev.offset + prev.limit }))}
                    disabled={!detalhes.paginacao?.temMais}
                    className="border border-white/20 bg-white/5 text-slate-200"
                  >
                    Proxima pagina
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[linear-gradient(155deg,rgba(15,23,42,0.92),rgba(15,23,42,0.72))] px-4 py-4 shadow-inner shadow-cyan-500/5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </article>
  );
}

function StateBox({ text, tone = "info" }: { text: string; tone?: "info" | "error" | "empty" }) {
  const classes = {
    info: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
    error: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    empty: "border-white/20 bg-white/5 text-slate-300",
  };

  return <p className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${classes[tone]}`}>{text}</p>;
}

export default DashboardEntrevistadores;
