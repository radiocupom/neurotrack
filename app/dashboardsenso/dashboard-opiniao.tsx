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
import { useOpiniaoDashboard } from "@/app/dashboardsenso/use-opiniao-dashboard";
import { useDashboardFilters } from "@/app/dashboardsenso/use-dashboard-filters";
import { SensoHeatMap, type HeatPoint } from "@/app/dashboardsenso/senso-heatmap";
import type { DashboardAnaliseIa } from "@/app/dashboardsenso/dashboard-types";

export type DashboardOpiniaoProps = {
  loggedUser: AuthUser;
};

type AbaOpiniao = "resultado" | "ia";

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR");
}

function readNumber(value: unknown) {
  return typeof value === "number" ? value : 0;
}

export function DashboardOpiniao({ loggedUser }: DashboardOpiniaoProps) {
  const [aba, setAba] = useState<AbaOpiniao>("resultado");
  const [loadingIa, setLoadingIa] = useState(false);
  const [iaError, setIaError] = useState("");
  const { opiniaoFilters, patchFilters, clearFilters } = useDashboardFilters();
  const opiniao = useOpiniaoDashboard(opiniaoFilters);

  const { isConnected } = useDashboardRealtime({
    onDashboardUpdate: () => {
      void opiniao.refetch();
    },
    onBigFiveRespostaRegistrada: () => {},
    onOpiniaoRespostaRegistrada: () => {
      void opiniao.refetch();
    },
  });

  const totalFiltros = useMemo(
    () => Object.keys(opiniaoFilters).filter((key) => opiniaoFilters[key] != null && String(opiniaoFilters[key]).trim() !== "").length,
    [opiniaoFilters],
  );

  const charts = useMemo(() => {
    const perguntas = opiniao.resumo?.resultado ?? [];

    return perguntas.map((pergunta) => ({
      id: pergunta.id,
      title: pergunta.texto,
      data: pergunta.opcoes.map((opcao) => ({
        categoria: opcao.texto,
        total: readNumber(opcao.total),
      })),
    }));
  }, [opiniao.resumo]);

  const heatPoints = useMemo<HeatPoint[]>(() => {
    if (!opiniao.participantesComCoordenada) {
      return [];
    }

    const points: HeatPoint[] = [];

    opiniao.participantesComCoordenada.respostas.forEach((item) => {
        const latitude =
          typeof item.latitude === "number"
            ? item.latitude
            : typeof item.coordenada?.latitude === "number"
              ? item.coordenada.latitude
              : null;

        const longitude =
          typeof item.longitude === "number"
            ? item.longitude
            : typeof item.coordenada?.longitude === "number"
              ? item.coordenada.longitude
              : null;

        if (latitude == null || longitude == null) {
          return;
        }

        points.push({
          lat: latitude,
          lng: longitude,
          intensity: 0.65,
        });
      });

    return points;
  }, [opiniao.participantesComCoordenada]);

  const indisponibilidadeIa = useMemo(() => {
    const limitacoes = Array.isArray(opiniao.analiseIa?.limitacoes) ? opiniao.analiseIa.limitacoes : [];
    return limitacoes.find((item) => /indispon|openai|fallback|temporar/i.test(item)) || "";
  }, [opiniao.analiseIa]);

  const carregarAnaliseIa = useCallback(async () => {
    setLoadingIa(true);
    setIaError("");

    try {
      await opiniao.refetchAnaliseIa();
    } catch (error) {
      setIaError(error instanceof Error ? error.message : "Falha ao carregar relatorio IA de opiniao.");
    } finally {
      setLoadingIa(false);
    }
  }, [opiniao]);

  useEffect(() => {
    if (aba !== "ia" || !opiniao.pesquisaId || opiniao.analiseIa || loadingIa) {
      return;
    }

    void carregarAnaliseIa();
  }, [aba, opiniao.pesquisaId, opiniao.analiseIa, loadingIa, carregarAnaliseIa]);

  return (
    <section className="flex flex-1 min-w-0 flex-col p-3 sm:p-6 lg:p-8">
      <div className="min-w-0 rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(8,15,31,0.88),rgba(15,23,42,0.78))] p-4 sm:p-6 shadow-2xl shadow-slate-950/40">
        <header className="border-b border-white/10 pb-6">
          <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200">
            Dashboard Inteligente
          </div>
          <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">Pesquisa de Opiniao</h2>
          <p className="mt-2 text-sm text-slate-300">Resultado agregado, participantes e atualizacao em tempo real.</p>
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

        <div className="mt-6 flex w-full flex-wrap rounded-2xl border border-white/10 bg-slate-950/55 p-1 sm:inline-flex sm:w-auto">
          <button
            type="button"
            onClick={() => setAba("resultado")}
            className={[
              "min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:min-w-40 sm:flex-none",
              aba === "resultado"
                ? "bg-cyan-500 text-slate-950"
                : "text-slate-200 hover:bg-white/5",
            ].join(" ")}
          >
            Resultado
          </button>
          <button
            type="button"
            onClick={() => setAba("ia")}
            className={[
              "min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:min-w-40 sm:flex-none",
              aba === "ia"
                ? "bg-cyan-500 text-slate-950"
                : "text-slate-200 hover:bg-white/5",
            ].join(" ")}
          >
            Relatorio IA
          </button>
        </div>

        {aba === "resultado" ? (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-bold text-white">Filtros de Opiniao</h3>
              <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300">
                {totalFiltros} ativos
              </span>
            </div>

            <div className="grid gap-3 lg:grid-cols-5">
              <label className="block text-sm text-slate-300 lg:col-span-2">
                <span className="mb-1 block">Pesquisa</span>
                <select
                  value={opiniao.pesquisaId}
                  onChange={(event) => opiniao.setPesquisaId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                >
                  <option value="">Selecione</option>
                  {opiniao.pesquisas.map((item) => (
                    <option key={item.id} value={item.id}>{item.titulo}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-300">
                <span className="mb-1 block">Estado</span>
                <input
                  value={String(opiniaoFilters.estado ?? "")}
                  onChange={(event) => patchFilters("opiniao", { estado: event.target.value, offset: 0 })}
                  className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  placeholder="SP"
                />
              </label>

              <label className="block text-sm text-slate-300">
                <span className="mb-1 block">Cidade</span>
                <input
                  value={String(opiniaoFilters.cidade ?? "")}
                  onChange={(event) => patchFilters("opiniao", { cidade: event.target.value, offset: 0 })}
                  className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  placeholder="Sao Paulo"
                />
              </label>

              <label className="block text-sm text-slate-300">
                <span className="mb-1 block">Contato</span>
                <input
                  value={String(opiniaoFilters.contato ?? "")}
                  onChange={(event) => patchFilters("opiniao", { contato: event.target.value, offset: 0 })}
                  className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  placeholder="Telefone"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={() => void opiniao.refetch()} className="bg-cyan-500 text-slate-950">Atualizar</Button>
              <Button type="button" onClick={() => clearFilters("opiniao")} className="border border-white/20 bg-white/5 text-slate-200">Limpar filtros</Button>
            </div>
          </div>

          {opiniao.state === "loading" ? <StateBox text="Carregando dashboard de opiniao..." /> : null}
          {opiniao.state === "error" ? <StateBox text={opiniao.error || "Falha ao carregar dashboard de opiniao."} tone="error" /> : null}
          {opiniao.state === "success" && !opiniao.hasData ? <StateBox text="Nenhum dado encontrado para os filtros atuais." tone="empty" /> : null}

          {opiniao.resumo ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <KpiCard label="Total de respostas" value={String(opiniao.resumo.totalRespostasFiltradas)} />
              <KpiCard label="Perguntas" value={String(opiniao.resumo.resultado.length)} />
              <KpiCard label="Pesquisa" value={opiniao.resumo.titulo} />
            </div>
          ) : null}

          {charts.length > 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-bold text-white">Distribuicao por Pergunta</h3>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {charts.map((chart) => (
                  <article key={chart.id} className="min-w-0 rounded-xl border border-white/10 bg-slate-950/45 p-4">
                    <h4 className="text-sm font-semibold text-white">{chart.title}</h4>
                    <div className="mt-3 min-w-0 w-full">
                      <ResponsiveContainer width="100%" height={260} minWidth={0}>
                        <BarChart data={chart.data} margin={{ top: 8, right: 8, left: 0, bottom: 36 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                          <XAxis
                            dataKey="categoria"
                            stroke="#94a3b8"
                            angle={-15}
                            textAnchor="end"
                            interval={0}
                            height={56}
                            tick={{ fontSize: 11 }}
                          />
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
                          <Bar dataKey="total" fill="#22d3ee" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-white">Mapa de calor por localizacao</h3>
              <span className="text-xs text-slate-400">Pontos: {heatPoints.length}</span>
            </div>
            <SensoHeatMap points={heatPoints} />
          </div>

          {opiniao.participantes ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-white">Participantes</h3>
                <span className="text-xs text-slate-400">
                  Offset: {Number(opiniaoFilters.offset ?? 0)} | Limite: {Number(opiniaoFilters.limit ?? 20)}
                </span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-200">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="px-2 py-2">Respondido em</th>
                      <th className="px-2 py-2">Participante</th>
                      <th className="px-2 py-2">Contato</th>
                      <th className="px-2 py-2">Localidade</th>
                      <th className="px-2 py-2">Entrevistador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opiniao.participantes.respostas.map((item) => (
                      <tr key={item.id} className="border-b border-white/5 align-top">
                        <td className="px-2 py-2 text-xs text-slate-400">{formatDate(item.respondidoEm)}</td>
                        <td className="px-2 py-2">{item.participante?.nome || "-"}</td>
                        <td className="px-2 py-2">{item.participante?.contatoOpcional || "-"}</td>
                        <td className="px-2 py-2">{[item.bairro, item.cidade, item.estado].filter(Boolean).join(" - ") || "-"}</td>
                        <td className="px-2 py-2">{item.entrevistador?.nome || item.entrevistador?.email || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
        ) : (
          <div className="mt-6">
            <IaCardsBlock
              analise={opiniao.analiseIa}
              loading={loadingIa}
              error={iaError}
              indisponibilidade={indisponibilidadeIa}
              onRefresh={() => void carregarAnaliseIa()}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </article>
  );
}

function StateBox({ text, tone = "info" }: { text: string; tone?: "info" | "error" | "empty" }) {
  const classes =
    tone === "error"
      ? "border-red-400/30 bg-red-500/10 text-red-100"
      : tone === "empty"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
        : "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${classes}`}>
      {text}
    </div>
  );
}

function IaCardsBlock({
  analise,
  loading,
  error,
  indisponibilidade,
  onRefresh,
}: {
  analise: DashboardAnaliseIa | null;
  loading: boolean;
  error: string;
  indisponibilidade: string;
  onRefresh: () => void;
}) {
  const cards = analise?.cards && typeof analise.cards === "object" ? analise.cards : null;
  const resumoExecutivo = Array.isArray(analise?.resumoExecutivo) ? analise.resumoExecutivo : [];
  const riscosEAcoes = Array.isArray(analise?.riscosEAcoes) ? analise.riscosEAcoes : [];
  const limitacoes = Array.isArray(analise?.limitacoes) ? analise.limitacoes : [];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">Relatorio IA</h3>
          <p className="mt-1 text-xs text-slate-400">Analise inteligente da pesquisa de opiniao com fallback seguro do backend.</p>
        </div>
        <Button type="button" onClick={onRefresh} disabled={loading} className="bg-cyan-500 text-slate-950">
          {loading ? "Atualizando..." : "Atualizar analise"}
        </Button>
      </div>

      {error ? <StateBox text={error} tone="error" /> : null}

      {loading ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="h-36 animate-pulse rounded-xl border border-white/10 bg-slate-900/70" />
          <div className="h-36 animate-pulse rounded-xl border border-white/10 bg-slate-900/70" />
          <div className="h-28 animate-pulse rounded-xl border border-white/10 bg-slate-900/70 lg:col-span-2" />
        </div>
      ) : null}

      {!loading && indisponibilidade ? (
        <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {indisponibilidade}
        </div>
      ) : null}

      {!loading && !analise ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-slate-300">
          Nenhuma analise carregada ainda. Use o botao para buscar o relatorio IA da pesquisa.
        </div>
      ) : null}

      {!loading && analise ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {cards?.classificacao ? (
              <article className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
                <h4 className="text-sm font-bold text-cyan-300">Classificacao da pesquisa</h4>
                <pre className="mt-2 overflow-auto text-xs text-slate-300">{JSON.stringify(cards.classificacao, null, 2)}</pre>
              </article>
            ) : null}

            {cards?.metodos ? (
              <article className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
                <h4 className="text-sm font-bold text-cyan-300">Metodos estatisticos</h4>
                <pre className="mt-2 overflow-auto text-xs text-slate-300">{JSON.stringify(cards.metodos, null, 2)}</pre>
              </article>
            ) : null}
          </div>

          {resumoExecutivo.length > 0 ? (
            <article className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
              <h4 className="text-sm font-bold text-cyan-300">Resumo executivo</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                {resumoExecutivo.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </article>
          ) : null}

          {riscosEAcoes.length > 0 ? (
            <article className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
              <h4 className="text-sm font-bold text-cyan-300">Riscos e acoes</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                {riscosEAcoes.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </article>
          ) : null}

          {limitacoes.length > 0 ? (
            <article className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
              <h4 className="text-sm font-bold text-cyan-300">Limitacoes</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                {limitacoes.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
