"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { MetricCardVoto } from "@/app/components/intencao-voto-compostos";
import { Alert, Button, Loading } from "@/app/components/ui-primitives";
import { SensoHeatMap, type HeatPoint } from "@/app/dashboardsenso/senso-heatmap";
import {
  obterPesquisaIntencaoVotoAction,
  obterResultadosIntencaoVotoAction,
  obterStatusFilaIntencaoVotoAction,
} from "@/app/intencao-voto/workflow-actions";
import type { AuthUser } from "@/lib/auth/types";
import { usePesquisasIntencaoVoto } from "@/lib/hooks/use-pesquisas-intencao-voto";
import type { PesquisaIntencaoVotoDetalhe, ResultadoIntencaoVoto, StatusFilaIntencaoVoto } from "@/types/intencao-voto";

function emptyQueue(): StatusFilaIntencaoVoto {
  return { total: 0, pendentes: 0, processadas: 0, falhas: 0 };
}

export type DashboardVotoProps = {
  loggedUser: AuthUser;
};

export function DashboardVoto({ loggedUser }: DashboardVotoProps) {
  const { pesquisas, loading: loadingPesquisas, error: errorPesquisas } = usePesquisasIntencaoVoto({ autoload: true });
  const [pesquisaId, setPesquisaId] = useState("");
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [pesquisa, setPesquisa] = useState<PesquisaIntencaoVotoDetalhe | null>(null);
  const [resultado, setResultado] = useState<ResultadoIntencaoVoto | null>(null);
  const [fila, setFila] = useState<StatusFilaIntencaoVoto>(emptyQueue());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedPesquisaId = pesquisaId || pesquisas[0]?.id || "";
  const pesquisasDisponiveis = useMemo(
    () => pesquisas.map((item) => ({ id: item.id, titulo: item.titulo })),
    [pesquisas],
  );
  const pesquisaAtual = pesquisa?.id === selectedPesquisaId ? pesquisa : null;
  const resultadoAtual = pesquisa?.id === selectedPesquisaId ? resultado : null;

  useEffect(() => {
    if (!selectedPesquisaId) {
      console.log("[dashboard-voto] nenhuma pesquisa selecionada para carregar resultados");
      return;
    }

    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      console.log("[dashboard-voto] iniciando carga do dashboard", {
        selectedPesquisaId,
        refreshSeed,
        pesquisasDisponiveis,
      });

      const [pesquisaResult, resultadoResult, filaResult] = await Promise.all([
        obterPesquisaIntencaoVotoAction(selectedPesquisaId),
        obterResultadosIntencaoVotoAction(selectedPesquisaId),
        obterStatusFilaIntencaoVotoAction(),
      ]);

      if (!mounted) {
        return;
      }

      console.log("[dashboard-voto] respostas recebidas", {
        selectedPesquisaId,
        pesquisaResult,
        resultadoResult,
        filaResult,
      });

      if (!pesquisaResult.ok || !pesquisaResult.data) {
        setPesquisa(null);
        setResultado(null);
        setError(pesquisaResult.message || "Falha ao carregar pesquisa do dashboard.");
        setLoading(false);
        return;
      }

      if (!resultadoResult.ok || !resultadoResult.data) {
        setPesquisa(null);
        setResultado(null);
        setError(resultadoResult.message || "Falha ao carregar resultados do dashboard.");
        setLoading(false);
        return;
      }

      setPesquisa(pesquisaResult.data);
      setResultado(resultadoResult.data);
      setFila(filaResult.ok && filaResult.data ? filaResult.data : emptyQueue());
      setLoading(false);

      console.log("[dashboard-voto] estado final apos carga", {
        selectedPesquisaId,
        pesquisaId: pesquisaResult.data.id,
        totalVotos: resultadoResult.data.totalVotos,
        rankingCount: resultadoResult.data.ranking.length,
        canaisCount: resultadoResult.data.votosPorCanal.length,
        geolocalizadosCount: resultadoResult.data.votosGeolocalizados.length,
      });
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, [pesquisasDisponiveis, refreshSeed, selectedPesquisaId]);

  const rankingData = useMemo(
    () =>
      (resultadoAtual?.ranking || []).map((item) => ({
        nome: item.nome,
        votos: item.votos,
        percentual: item.percentual ?? 0,
      })),
    [resultadoAtual],
  );

  const canalData = useMemo(
    () =>
      (resultadoAtual?.votosPorCanal || []).map((item) => ({
        canal: item.canal,
        total: item.total,
      })),
    [resultadoAtual],
  );

  const heatPoints = useMemo<HeatPoint[]>(() => {
    const points: HeatPoint[] = [];

    (resultadoAtual?.votosGeolocalizados || []).forEach((item) => {
      const latitude = item.latitude ?? item.coordenada?.latitude ?? null;
      const longitude = item.longitude ?? item.coordenada?.longitude ?? null;
      if (latitude == null || longitude == null) {
        return;
      }

      points.push({ lat: latitude, lng: longitude, intensity: 0.7 });
    });

    return points;
  }, [resultadoAtual]);

  const hasResultadoData = useMemo(() => {
    if (!resultadoAtual) {
      return false;
    }

    return resultadoAtual.totalVotos > 0 || rankingData.length > 0 || canalData.length > 0 || heatPoints.length > 0;
  }, [canalData.length, heatPoints.length, rankingData.length, resultadoAtual]);

  useEffect(() => {
    if (!selectedPesquisaId || !resultadoAtual) {
      return;
    }

    console.log("[dashboard-voto] avaliacao de renderizacao", {
      selectedPesquisaId,
      totalVotos: resultadoAtual.totalVotos,
      rankingCount: rankingData.length,
      canaisCount: canalData.length,
      heatPointsCount: heatPoints.length,
      hasResultadoData,
    });
  }, [canalData.length, hasResultadoData, heatPoints.length, rankingData.length, resultadoAtual, selectedPesquisaId]);

  return (
    <section className="flex min-w-0 flex-1 flex-col p-3 sm:p-6 lg:p-8">
      <div className="rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(8,15,31,0.88),rgba(15,23,42,0.78))] p-4 shadow-2xl shadow-slate-950/40 sm:p-6">
        <header className="border-b border-white/10 pb-6">
          <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200">
            Dashboard Inteligente
          </div>
          <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">Pesquisa de Voto</h2>
          <p className="mt-2 text-sm text-slate-300">Resultados consolidados, fila de processamento e distribuicao territorial por pesquisa.</p>
          <p className="mt-3 text-xs text-slate-400">Perfil logado: {loggedUser.nome} ({loggedUser.papel})</p>
        </header>

        <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <label className="min-w-[260px] flex-1 text-sm text-slate-300">
            <span className="mb-2 block">Pesquisa</span>
            <select
              value={selectedPesquisaId}
              onChange={(event) => setPesquisaId(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
              disabled={loadingPesquisas || loading || pesquisas.length === 0}
            >
              <option value="">Selecione</option>
              {pesquisas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.titulo}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={() => setRefreshSeed((current) => current + 1)} variant="secondary" disabled={loading || pesquisas.length === 0}>
            Atualizar
          </Button>
        </div>

        {loadingPesquisas || loading ? <Loading message="Carregando dashboard de voto..." /> : null}
        {errorPesquisas ? <Alert type="error">{errorPesquisas}</Alert> : null}
        {error ? <Alert type="error">{error}</Alert> : null}
        {!loadingPesquisas && !errorPesquisas && pesquisas.length === 0 ? (
          <Alert type="warning">Nenhuma pesquisa de voto foi encontrada para alimentar o dashboard.</Alert>
        ) : null}

        {selectedPesquisaId && !loading && !error && pesquisaAtual && resultadoAtual && !hasResultadoData ? (
          <Alert type="info" className="mt-6">
            Nenhum voto consolidado foi encontrado para a pesquisa selecionada. Se ja houver votos no backend, o retorno do endpoint de resultados precisa ser conferido.
          </Alert>
        ) : null}

        {pesquisaAtual && resultadoAtual ? (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 lg:grid-cols-4">
              <MetricCardVoto label="Total de votos" value={String(resultadoAtual.totalVotos)} />
              <MetricCardVoto label="Candidatos" value={String(pesquisaAtual.candidatos.length)} />
              <MetricCardVoto label="Fila pendente" value={String(fila.pendentes)} />
              <MetricCardVoto label="Fila processada" value={String(fila.processadas)} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-bold text-white">Ranking de candidatos</h3>
                <div className="mt-4 h-[320px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rankingData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                      <XAxis dataKey="nome" stroke="#94a3b8" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={56} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(56,189,248,0.12)" }}
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "rgba(148,163,184,0.35)",
                          borderRadius: 10,
                          color: "#e2e8f0",
                        }}
                      />
                      <Bar dataKey="votos" fill="#22d3ee" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-bold text-white">Votos por canal</h3>
                <div className="mt-4 h-[320px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={canalData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                      <XAxis dataKey="canal" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(56,189,248,0.12)" }}
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "rgba(148,163,184,0.35)",
                          borderRadius: 10,
                          color: "#e2e8f0",
                        }}
                      />
                      <Bar dataKey="total" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-white">Mapa de calor de votos geolocalizados</h3>
                <span className="text-xs text-slate-400">Pontos: {heatPoints.length}</span>
              </div>
              <SensoHeatMap points={heatPoints} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default DashboardVoto;
