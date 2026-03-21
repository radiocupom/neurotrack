"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { MetricCardVoto } from "@/app/components/intencao-voto-compostos";
import { Alert, Button, Loading } from "@/app/components/ui-primitives";
import {
  obterParticipantesVotoDashboardAction,
  obterResumoVotoDashboardAction,
} from "@/app/dashboardsenso/dashboard-actions";
import { useDashboardRealtime } from "@/app/dashboardsenso/use-dashboard-realtime";
import type { HeatPoint } from "@/app/dashboardsenso/senso-heatmap";

const SensoHeatMap = dynamic(
  () => import("@/app/dashboardsenso/senso-heatmap").then((mod) => mod.SensoHeatMap),
  { ssr: false },
);
import { obterStatusFilaIntencaoVotoAction } from "@/app/intencao-voto/workflow-actions";
import type { AuthUser } from "@/lib/auth/types";
import { usePesquisasIntencaoVoto } from "@/lib/hooks/use-pesquisas-intencao-voto";
import type {
  DashboardVotoFiltros,
  DashboardVotoItem,
  DashboardVotoParticipantes,
  DashboardVotoResumoGeral,
} from "@/app/dashboardsenso/dashboard-types";
import type { StatusFilaIntencaoVoto } from "@/types/intencao-voto";
import {
  carregarCidadesPorUf,
  carregarEstadosBrasileiros,
  type CidadeOption,
  type EstadoOption,
} from "@/service/localidades-publicas.service";

const LIMITE_PAGINA = 10;

function emptyQueue(): StatusFilaIntencaoVoto {
  return { total: 0, pendentes: 0, processadas: 0, falhas: 0 };
}

function emptyFiltros(): DashboardVotoFiltros {
  return { estado: "", cidade: "", bairro: "", candidatoId: "", idadeMin: "", idadeMax: "", limit: LIMITE_PAGINA, offset: 0 };
}

function formatData(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("pt-BR");
}

function buildResumoFiltros(filtros: DashboardVotoFiltros) {
  const query: Record<string, string> = {};
  if (filtros.estado) query.estado = filtros.estado;
  if (filtros.cidade) query.cidade = filtros.cidade;
  if (filtros.bairro) query.bairro = filtros.bairro;
  if (filtros.candidatoId) query.candidatoId = filtros.candidatoId;
  if (filtros.idadeMin) query.idadeMin = String(filtros.idadeMin);
  if (filtros.idadeMax) query.idadeMax = String(filtros.idadeMax);
  return query;
}

export type DashboardVotoProps = {
  loggedUser: AuthUser;
};

export function DashboardVoto({ loggedUser }: DashboardVotoProps) {
  const { pesquisas, loading: loadingPesquisas, error: errorPesquisas } = usePesquisasIntencaoVoto({ autoload: true });

  // ── pesquisa selecionada ─────────────────────────────────────────────────
  const [pesquisaId, setPesquisaId] = useState("");
  const [refreshSeed, setRefreshSeed] = useState(0);
  const selectedPesquisaId = pesquisaId || pesquisas[0]?.id || "";
  const triggerRealtimeRefresh = useCallback(() => {
    setRefreshSeed((seed) => seed + 1);
  }, []);
  const { isConnected } = useDashboardRealtime({
    onDashboardUpdate: (module) => {
      if (!module || module === "intencao-voto" || module === "voto" || module === "intencao") {
        triggerRealtimeRefresh();
      }
    },
    onBigFiveRespostaRegistrada: () => {},
    onOpiniaoRespostaRegistrada: () => {},
    onIntencaoVotoRespostaRegistrada: () => {
      triggerRealtimeRefresh();
    },
  });

  // ── resumo da pesquisa (recalculado quando filtros mudam) ────────────────
  const [resumoGeral, setResumoGeral] = useState<DashboardVotoResumoGeral | null>(null);
  const [fila, setFila] = useState<StatusFilaIntencaoVoto>(emptyQueue());
  const [loadingResumo, setLoadingResumo] = useState(false);
  const [errorResumo, setErrorResumo] = useState("");

  // ── lista filtrada de votos ───────────────────────────────────────────────
  const [filtros, setFiltros] = useState<DashboardVotoFiltros>(emptyFiltros());
  const [listaVotos, setListaVotos] = useState<DashboardVotoParticipantes | null>(null);
  const [loadingVotos, setLoadingVotos] = useState(false);
  const [errorVotos, setErrorVotos] = useState("");

  // ── localidades (IBGE) ───────────────────────────────────────────────────
  const [estados, setEstados] = useState<EstadoOption[]>([]);
  const [cidades, setCidades] = useState<CidadeOption[]>([]);
  const [loadingCidades, setLoadingCidades] = useState(false);

  // carrega estados uma vez
  useEffect(() => {
    void carregarEstadosBrasileiros().then((result) => {
      if (result.ok && result.data) setEstados(result.data);
    });
  }, []);

  // carrega cidades quando estado muda
  useEffect(() => {
    if (!filtros.estado) { setCidades([]); return; }
    setLoadingCidades(true);
    void carregarCidadesPorUf(filtros.estado).then((result) => {
      setCidades(result.ok && result.data ? result.data : []);
      setLoadingCidades(false);
    });
  }, [filtros.estado]);

  // ── carga do resumo ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPesquisaId) return;
    let mounted = true;

    async function loadResumo() {
      setLoadingResumo(true);
      setErrorResumo("");
      const resumoFiltros = buildResumoFiltros(filtros);
      const [resumoResult, filaResult] = await Promise.all([
        obterResumoVotoDashboardAction(selectedPesquisaId, resumoFiltros),
        obterStatusFilaIntencaoVotoAction(),
      ]);
      if (!mounted) return;
      if (!resumoResult.ok || !resumoResult.data) {
        setResumoGeral(null);
        setErrorResumo(resumoResult.message || "Falha ao carregar resumo.");
        setLoadingResumo(false);
        return;
      }
      setResumoGeral(resumoResult.data as DashboardVotoResumoGeral);
      setFila(filaResult.ok && filaResult.data ? (filaResult.data as StatusFilaIntencaoVoto) : emptyQueue());
      setLoadingResumo(false);
    }

    void loadResumo();
    return () => { mounted = false; };
  }, [
    filtros.bairro,
    filtros.candidatoId,
    filtros.cidade,
    filtros.estado,
    filtros.idadeMax,
    filtros.idadeMin,
    refreshSeed,
    selectedPesquisaId,
  ]);

  // ── carga da lista de votos filtrada ─────────────────────────────────────
  const carregarVotos = useCallback(
    async (f: DashboardVotoFiltros, id: string) => {
      if (!id) return;
      setLoadingVotos(true);
      setErrorVotos("");

      const params: Record<string, string> = {
        limit: String(f.limit),
        offset: String(f.offset),
      };
      if (f.estado) params.estado = f.estado;
      if (f.cidade) params.cidade = f.cidade;
      if (f.bairro) params.bairro = f.bairro;
      if (f.candidatoId) params.candidatoId = f.candidatoId;
      if (f.idadeMin) params.idadeMin = f.idadeMin;
      if (f.idadeMax) params.idadeMax = f.idadeMax;

      const result = await obterParticipantesVotoDashboardAction(id, params);

      if (!result.ok || !result.data) {
        setErrorVotos(result.message || "Falha ao carregar votos.");
        setLoadingVotos(false);
        return;
      }

      setListaVotos(result.data as DashboardVotoParticipantes);
      setLoadingVotos(false);
    },
    [],
  );

  // dispara carga de votos sempre que pesquisa ou filtros mudarem
  useEffect(() => {
    if (!selectedPesquisaId) return;
    void carregarVotos(filtros, selectedPesquisaId);
  }, [filtros, selectedPesquisaId, carregarVotos, refreshSeed]);

  // reset ao trocar pesquisa
  useEffect(() => {
    setResumoGeral(null);
    setListaVotos(null);
    setFiltros(emptyFiltros());
  }, [selectedPesquisaId]);

  // ── listas derivadas ─────────────────────────────────────────────────────
  const candidatosDisponiveis = useMemo(
    () => (resumoGeral?.resultados ?? []).flatMap((r) => r.candidatos ?? []),
    [resumoGeral],
  );

  const heatPoints = useMemo<HeatPoint[]>(() => {
    return (listaVotos?.votos ?? []).flatMap((v) => {
      const lat = typeof v.latitude === "number" ? v.latitude : (v.coordenada?.latitude ?? null);
      const lng = typeof v.longitude === "number" ? v.longitude : (v.coordenada?.longitude ?? null);
      return lat != null && lng != null ? [{ lat, lng, intensity: 0.65 }] : [];
    });
  }, [listaVotos]);

  // ── helpers ──────────────────────────────────────────────────────────────
  function patchFiltros(patch: Partial<DashboardVotoFiltros>) {
    setFiltros((prev) => ({ ...prev, ...patch, offset: 0 }));
  }

  function proximaPagina() {
    if (!listaVotos?.paginacao?.temMais) return;
    setFiltros((prev) => ({ ...prev, offset: prev.offset + prev.limit }));
  }

  function paginaAnterior() {
    setFiltros((prev) => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }));
  }

  const votos = listaVotos?.votos ?? [];
  const totalFiltrado = listaVotos?.totalFiltrado ?? 0;
  const possuiFiltrosAtivos = Boolean(
    filtros.estado || filtros.cidade || filtros.bairro || filtros.candidatoId || filtros.idadeMin || filtros.idadeMax,
  );
  const rankingResultados = useMemo(() => {
    if (!possuiFiltrosAtivos) {
      return resumoGeral?.resultados ?? [];
    }

    const cargosMap = new Map<
      string,
      {
        cargo: string;
        candidatos: Map<string, { id: string; nome: string; partido?: string | null; total: number }>;
      }
    >();

    votos.forEach((voto) => {
      const cargo = voto.pesquisa?.cargo ?? "Sem cargo";
      const candidatoId = voto.candidato?.id ?? voto.candidato?.nome ?? voto.id;
      const candidatoNome = voto.candidato?.nome ?? "Sem candidato";
      const candidatoPartido = voto.candidato?.partido ?? null;

      if (!cargosMap.has(cargo)) {
        cargosMap.set(cargo, { cargo, candidatos: new Map() });
      }

      const cargoAtual = cargosMap.get(cargo);
      if (!cargoAtual) return;

      const candidatoAtual = cargoAtual.candidatos.get(candidatoId);
      if (candidatoAtual) {
        candidatoAtual.total += 1;
        return;
      }

      cargoAtual.candidatos.set(candidatoId, {
        id: candidatoId,
        nome: candidatoNome,
        partido: candidatoPartido,
        total: 1,
      });
    });

    return Array.from(cargosMap.values()).map((item) => ({
      cargo: item.cargo,
      candidatos: Array.from(item.candidatos.values()),
    }));
  }, [possuiFiltrosAtivos, resumoGeral, votos]);
  const totalCandidatosCard = rankingResultados.reduce((acc, resultado) => acc + resultado.candidatos.length, 0);
  const totalVotosCard = possuiFiltrosAtivos ? totalFiltrado : (resumoGeral?.totalRespostas ?? 0);
  const totalVotosLabel = possuiFiltrosAtivos ? "Total de votos filtrados" : "Total geral da pesquisa";

  return (
    <section className="flex min-w-0 flex-1 flex-col p-3 sm:p-6 lg:p-8">
      <div className="min-w-0 rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(8,15,31,0.88),rgba(15,23,42,0.78))] p-4 shadow-2xl shadow-slate-950/40 sm:p-6">

        {/* cabeçalho */}
        <header className="border-b border-white/10 pb-6">
          <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200">
            Dashboard Inteligente
          </div>
          <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">Intenção de Voto</h2>
          <p className="mt-2 text-sm text-slate-300">Resultados consolidados, mapa de calor e lista de votos por pesquisa.</p>
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

        {/* ── painel de controles: pesquisa + filtros ── */}
        <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          {/* linha 1: seletor de pesquisa */}
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[260px] flex-1 text-sm text-slate-300">
              <span className="mb-1.5 block font-medium">Pesquisa</span>
              <select
                value={selectedPesquisaId}
                onChange={(e) => setPesquisaId(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                disabled={loadingPesquisas || pesquisas.length === 0}
              >
                <option value="">Selecione</option>
                {pesquisas.map((item) => (
                  <option key={item.id} value={item.id}>{item.titulo}</option>
                ))}
              </select>
            </label>
            <Button
              onClick={() => setRefreshSeed((s) => s + 1)}
              variant="secondary"
              disabled={loadingResumo || loadingVotos || !selectedPesquisaId}
            >
              Atualizar
            </Button>
            <Button
              variant="secondary"
              onClick={() => setFiltros(emptyFiltros())}
              disabled={loadingVotos || !selectedPesquisaId}
            >
              Limpar filtros
            </Button>
          </div>

          {/* linha 2: filtros */}
          {selectedPesquisaId ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {/* estado — select IBGE */}
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                <span>Estado</span>
                <select
                  value={filtros.estado}
                  onChange={(e) => patchFiltros({ estado: e.target.value, cidade: "" })}
                  className="h-10 rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                >
                  <option value="">Todos</option>
                  {estados.map((e) => (
                    <option key={e.sigla} value={e.sigla}>{e.sigla} — {e.nome}</option>
                  ))}
                </select>
              </label>

              {/* cidade — select IBGE dependente do estado */}
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                <span>Cidade</span>
                <select
                  value={filtros.cidade}
                  onChange={(e) => patchFiltros({ cidade: e.target.value })}
                  className="h-10 rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  disabled={!filtros.estado || loadingCidades}
                >
                  <option value="">{loadingCidades ? "Carregando..." : "Todas"}</option>
                  {cidades.map((c) => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
              </label>

              {/* bairro — texto livre */}
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                <span>Bairro</span>
                <input
                  type="text"
                  value={filtros.bairro}
                  onChange={(e) => patchFiltros({ bairro: e.target.value })}
                  placeholder="Bairro"
                  className="h-10 rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </label>

              {/* candidato — select a partir do consolidado */}
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                <span>Candidato</span>
                <select
                  value={filtros.candidatoId}
                  onChange={(e) => patchFiltros({ candidatoId: e.target.value })}
                  className="h-10 rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  disabled={candidatosDisponiveis.length === 0}
                >
                  <option value="">Todos</option>
                  {candidatosDisponiveis.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.partido ?? "—"})</option>
                  ))}
                </select>
              </label>

              {/* idade mínima */}
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                <span>Idade mín.</span>
                <input
                  type="number"
                  min={0}
                  value={filtros.idadeMin}
                  onChange={(e) => patchFiltros({ idadeMin: e.target.value })}
                  placeholder="Ex: 18"
                  className="h-10 rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </label>

              {/* idade máxima */}
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                <span>Idade máx.</span>
                <input
                  type="number"
                  min={0}
                  value={filtros.idadeMax}
                  onChange={(e) => patchFiltros({ idadeMax: e.target.value })}
                  placeholder="Ex: 60"
                  className="h-10 rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </label>
            </div>
          ) : null}
        </div>

        {/* erros e loading de pesquisas */}
        {loadingPesquisas ? <Loading message="Carregando pesquisas..." /> : null}
        {errorPesquisas ? <Alert type="error">{errorPesquisas}</Alert> : null}
        {!loadingPesquisas && !errorPesquisas && pesquisas.length === 0 ? (
          <Alert type="warning">Nenhuma pesquisa de voto encontrada.</Alert>
        ) : null}

        {selectedPesquisaId ? (
          <div className="mt-6 space-y-6">

            {/* ── KPI cards ── */}
            {loadingResumo ? <Loading message="Carregando resumo..." /> : null}
            {errorResumo ? <Alert type="error">{errorResumo}</Alert> : null}

            {resumoGeral ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCardVoto label={totalVotosLabel} value={String(totalVotosCard)} />
                <MetricCardVoto label="Candidatos" value={String(totalCandidatosCard)} />
                <MetricCardVoto label="Fila pendente" value={String(fila.pendentes)} />
                <MetricCardVoto label="Fila processada" value={String(fila.processadas)} />
              </div>
            ) : null}

            {/* ── gráfico de ranking por cargo ── */}
            {rankingResultados.map((resultado) => {
              const chartData = (resultado.candidatos ?? []).map((c) => ({
                nome: c.nome ?? "",
                votos: c.total ?? 0,
              }));
              return (
                <div key={resultado.cargo} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-lg font-bold text-white">
                    Ranking — {resultado.cargo}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {possuiFiltrosAtivos ? "(resultado filtrado)" : "(total geral)"}
                    </span>
                  </h3>
                  <div className="mt-4" style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer width="100%" height={300} minWidth={0}>
                      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                        <XAxis dataKey="nome" stroke="#94a3b8" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={56} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          cursor={{ fill: "rgba(56,189,248,0.12)" }}
                          contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(148,163,184,0.35)", borderRadius: 10, color: "#e2e8f0" }}
                          formatter={(v: number) => [`${v} voto(s)`, "Votos"]}
                        />
                        <Bar dataKey="votos" fill="#22d3ee" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}

            {/* ── mapa de calor (fonte: votos filtrados) ── */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-white">Mapa de calor — votos geolocalizados</h3>
                <span className="text-xs text-slate-400">
                  {loadingVotos ? "Carregando..." : `${heatPoints.length} ponto(s) com coordenadas`}
                </span>
              </div>
              <SensoHeatMap points={heatPoints} />
            </div>

            {/* ── lista de votos filtrada + paginada ── */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-white">Lista de votos</h3>
                {listaVotos ? (
                  <span className="text-xs text-slate-400">
                    Total filtrado: <strong className="text-white">{totalFiltrado}</strong>
                    {resumoGeral ? (
                      <span className="ml-2 text-slate-500">(geral: {resumoGeral.totalRespostas})</span>
                    ) : null}
                  </span>
                ) : null}
              </div>

              {loadingVotos ? <Loading message="Carregando votos..." /> : null}
              {errorVotos ? <Alert type="error">{errorVotos}</Alert> : null}

              {!loadingVotos && listaVotos && votos.length === 0 ? (
                <Alert type="info">Nenhum voto encontrado para os filtros aplicados.</Alert>
              ) : null}

              {!loadingVotos && votos.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-slate-200">
                      <thead className="border-b border-white/10 bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400">
                        <tr>
                          {["Candidato", "Partido", "Cargo", "Canal", "Participante", "Idade", "Estado", "Cidade", "Bairro", "Entrevistador", "Data"].map(
                            (col) => (
                              <th key={col} className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                                {col}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {votos.map((v: DashboardVotoItem) => (
                          <tr key={v.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="px-4 py-3 font-medium">{v.candidato?.nome ?? "—"}</td>
                            <td className="px-4 py-3 text-slate-400">{v.candidato?.partido ?? "—"}</td>
                            <td className="px-4 py-3 text-slate-400">{v.pesquisa?.cargo ?? "—"}</td>
                            <td className="px-4 py-3">{v.canal ?? "—"}</td>
                            <td className="px-4 py-3">{v.participante?.nome ?? "—"}</td>
                            <td className="px-4 py-3 text-center">{v.idade ?? "—"}</td>
                            <td className="px-4 py-3">{v.estado ?? "—"}</td>
                            <td className="px-4 py-3">{v.cidade ?? "—"}</td>
                            <td className="px-4 py-3">{v.bairro ?? "—"}</td>
                            <td className="px-4 py-3 text-slate-400">{v.entrevistador?.nome ?? "—"}</td>
                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatData(v.criadoEm)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* paginação */}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Button variant="secondary" onClick={paginaAnterior} disabled={filtros.offset === 0 || loadingVotos}>
                      Anterior
                    </Button>
                    <span className="text-xs text-slate-400">
                      {filtros.offset + 1}–{Math.min(filtros.offset + filtros.limit, totalFiltrado)} de {totalFiltrado}
                    </span>
                    <Button
                      variant="secondary"
                      onClick={proximaPagina}
                      disabled={!listaVotos?.paginacao?.temMais || loadingVotos}
                    >
                      Próxima
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default DashboardVoto;
