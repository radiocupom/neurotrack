"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
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
import type { DashboardBigFiveResumo } from "@/app/dashboardsenso/dashboard-types";
import type { AuthUser } from "@/lib/auth/types";
import { useBigFiveDashboard } from "@/app/dashboardsenso/use-bigfive-dashboard";
import { useDashboardFilters } from "@/app/dashboardsenso/use-dashboard-filters";
import { useDashboardRealtime } from "@/app/dashboardsenso/use-dashboard-realtime";
import { useSensoDashboard } from "@/app/dashboardsenso/use-senso-dashboard";
import {
  carregarEstadosBrasileiros,
  carregarCidadesPorUf,
  type EstadoOption,
  type CidadeOption,
} from "@/service/localidades-publicas.service";

export type DashboardSensoBigFiveProps = {
  loggedUser: AuthUser;
};

type Aba = "senso" | "bigfive";
type BigFiveDetailTab = "bigfive" | "senso";
type BigFiveParticipant = NonNullable<NonNullable<DashboardBigFiveResumo["participantes"]>[number]>;

const SensoHeatMap = dynamic(
  () => import("@/app/dashboardsenso/senso-heatmap").then((mod) => mod.SensoHeatMap),
  { ssr: false },
);

const DEMOGRAFIC_QUESTIONS = [
  "Qual e a sua faixa etaria?",
  "Como voce se identifica em relacao ao genero?",
  "Qual e o seu nivel de escolaridade?",
  "Qual e a sua faixa de renda familiar mensal?",
  "Qual e a sua situacao de trabalho atual?",
  "Qual e o seu estado civil?",
  "Qual e a sua religiao ou crenca principal?",
  "Como voce se autodeclara em relacao a raca/cor?",
];

function normalizeLabel(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

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

function hasActiveFilterValue(value: unknown) {
  if (value == null) {
    return false;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value).trim() !== "";
}

export function DashboardSensoBigFive({ loggedUser }: DashboardSensoBigFiveProps) {
  const [aba, setAba] = useState<Aba>("senso");
  const [selectedBigFiveParticipant, setSelectedBigFiveParticipant] = useState<BigFiveParticipant | null>(null);
  const [bigFiveDetailTab, setBigFiveDetailTab] = useState<BigFiveDetailTab>("bigfive");
  const [loadingSensoIa, setLoadingSensoIa] = useState(false);
  const [loadingBigFiveIa, setLoadingBigFiveIa] = useState(false);
  const [iaError, setIaError] = useState("");

  const { sensoFilters, bigFiveFilters, patchFilters, clearFilters } = useDashboardFilters();
  const senso = useSensoDashboard(sensoFilters);
  const bigfive = useBigFiveDashboard(bigFiveFilters);

  // ── localidades (IBGE) ───────────────────────────────────────────────────
  const [estados, setEstados] = useState<EstadoOption[]>([]);
  const [cidadesSenso, setCidadesSenso] = useState<CidadeOption[]>([]);
  const [loadingCidadesSenso, setLoadingCidadesSenso] = useState(false);
  const [cidadesBigFive, setCidadesBigFive] = useState<CidadeOption[]>([]);
  const [loadingCidadesBigFive, setLoadingCidadesBigFive] = useState(false);

  useEffect(() => {
    void carregarEstadosBrasileiros().then((result) => {
      if (result.ok && result.data) setEstados(result.data);
    });
  }, []);

  useEffect(() => {
    const estadoAtual = String(sensoFilters.estado ?? "");
    if (!estadoAtual) { setCidadesSenso([]); return; }
    setLoadingCidadesSenso(true);
    void carregarCidadesPorUf(estadoAtual).then((result) => {
      setCidadesSenso(result.ok && result.data ? result.data : []);
      setLoadingCidadesSenso(false);
    });
  }, [sensoFilters.estado]);

  useEffect(() => {
    const estadoAtual = String(bigFiveFilters.estado ?? "");
    if (!estadoAtual) { setCidadesBigFive([]); return; }
    setLoadingCidadesBigFive(true);
    void carregarCidadesPorUf(estadoAtual).then((result) => {
      setCidadesBigFive(result.ok && result.data ? result.data : []);
      setLoadingCidadesBigFive(false);
    });
  }, [bigFiveFilters.estado]);

  const { isConnected } = useDashboardRealtime({
    onDashboardUpdate: (module) => {
      if (!module || module === "senso-populacional") {
        void senso.refetch();
      }

      if (!module || module === "bigfive") {
        void bigfive.refetch();
      }
    },
    onBigFiveRespostaRegistrada: () => {
      void bigfive.refetch();
    },
  });

  const totalFiltrosSenso = useMemo(
    () => Object.entries(sensoFilters)
      .filter(([key, value]) => key !== "limit" && key !== "offset" && hasActiveFilterValue(value))
      .length,
    [sensoFilters],
  );

  const totalFiltrosBigFive = useMemo(
    () => Object.entries(bigFiveFilters)
      .filter(([key, value]) => key !== "limit" && key !== "offset" && hasActiveFilterValue(value))
      .length,
    [bigFiveFilters],
  );

  const sensoPerguntas = useMemo(
    () => senso.resumo?.resultado ?? [],
    [senso.resumo],
  );

  const sensoOpcoes = useMemo(() => {
    const perguntaId = String(sensoFilters.perguntaId ?? "");
    if (!perguntaId) {
      return [];
    }

    return sensoPerguntas.find((item) => item.id === perguntaId)?.opcoes ?? [];
  }, [sensoFilters.perguntaId, sensoPerguntas]);

  const bigFiveClassificacaoOptions = useMemo(
    () => Object.keys(bigfive.resumo?.resumo?.distribuicaoClassificacao ?? {}),
    [bigfive.resumo],
  );

  const demographicCharts = useMemo(() => {
    const questions = senso.resumo?.resultado ?? [];
    const normalizedMap = new Map(
      questions.map((question) => [normalizeLabel(question.texto), question]),
    );

    return DEMOGRAFIC_QUESTIONS
      .map((questionLabel) => {
        const found = normalizedMap.get(normalizeLabel(questionLabel));
        if (!found) {
          return null;
        }

        return {
          id: found.id,
          title: found.texto,
          data: found.opcoes.map((option) => ({
            categoria: option.texto,
            total: readNumber(option.total),
          })),
        };
      })
      .filter((item): item is { id: string; title: string; data: Array<{ categoria: string; total: number }> } => item != null);
  }, [senso.resumo]);

  const heatPoints = useMemo(() => {
    const respostas = senso.participantes?.respostas ?? [];
    return respostas
      .map((item) => {
        const lat =
          item.coordenada?.latitude != null
            ? Number(item.coordenada.latitude)
            : item.latitude != null
              ? Number(item.latitude)
              : null;
        const lng =
          item.coordenada?.longitude != null
            ? Number(item.coordenada.longitude)
            : item.longitude != null
              ? Number(item.longitude)
              : null;

        if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
          return null;
        }

        return { lat, lng, intensity: 0.9 };
      })
      .filter((point): point is { lat: number; lng: number; intensity: number } => point != null);
  }, [senso.participantes]);

  const bigFiveClassificacaoData = useMemo(() => {
    const distribuicao = bigfive.resumo?.resumo?.distribuicaoClassificacao ?? {};
    return Object.entries(distribuicao).map(([classificacao, total]) => ({
      classificacao,
      total: Number(total) || 0,
    }));
  }, [bigfive.resumo]);

  const bigFiveMediasData = useMemo(() => {
    const medias = bigfive.resumo?.resumo?.medias ?? {};
    return Object.entries(medias).map(([traco, valor]) => ({
      traco,
      media: Number(valor) || 0,
    }));
  }, [bigfive.resumo]);

  const bigFiveHeatPoints = useMemo(() => {
    const participantes = bigfive.resumo?.participantes ?? [];

    return participantes
      .map((item) => {
        const lat = item.coordenada?.latitude != null ? Number(item.coordenada.latitude) : null;
        const lng = item.coordenada?.longitude != null ? Number(item.coordenada.longitude) : null;

        if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
          return null;
        }

        return { lat, lng, intensity: 0.9 };
      })
      .filter((point): point is { lat: number; lng: number; intensity: number } => point != null);
  }, [bigfive.resumo]);

  async function handleGerarRelatorioIaSenso() {
    setLoadingSensoIa(true);
    setIaError("");

    try {
      await senso.refetchAnaliseIa();
    } catch (error) {
      setIaError(error instanceof Error ? error.message : "Falha ao gerar relatorio IA de senso.");
    } finally {
      setLoadingSensoIa(false);
    }
  }

  async function handleGerarRelatorioIaBigFive() {
    setLoadingBigFiveIa(true);
    setIaError("");

    try {
      await bigfive.refetchAnaliseIa();
    } catch (error) {
      setIaError(error instanceof Error ? error.message : "Falha ao gerar relatorio IA de Big Five.");
    } finally {
      setLoadingBigFiveIa(false);
    }
  }

  function openBigFiveParticipantDetail(participant: BigFiveParticipant) {
    setSelectedBigFiveParticipant(participant);
    setBigFiveDetailTab(participant.resultado ? "bigfive" : "senso");
  }

  function closeBigFiveParticipantDetail() {
    setSelectedBigFiveParticipant(null);
    setBigFiveDetailTab("bigfive");
  }

  return (
    <section className="flex flex-1 min-w-0 flex-col p-3 sm:p-6 lg:p-8">
      <div className="min-w-0 rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(8,15,31,0.88),rgba(15,23,42,0.78))] p-4 sm:p-6 shadow-2xl shadow-slate-950/40">
        <header className="border-b border-white/10 pb-6">
          <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200">
            Dashboard Inteligente
          </div>
          <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">Senso Populacional + Big Five</h2>
          <p className="mt-2 text-sm text-slate-300">Visao consolidada de campo, filtros operacionais e analise IA.</p>
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
            onClick={() => setAba("senso")}
            className={[
              "min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:min-w-40 sm:flex-none",
              aba === "senso"
                ? "bg-cyan-500 text-slate-950"
                : "text-slate-200 hover:bg-white/5",
            ].join(" ")}
          >
            Dashboard Senso
          </button>
          <button
            type="button"
            onClick={() => setAba("bigfive")}
            className={[
              "min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:min-w-40 sm:flex-none",
              aba === "bigfive"
                ? "bg-cyan-500 text-slate-950"
                : "text-slate-200 hover:bg-white/5",
            ].join(" ")}
          >
            Dashboard Big Five
          </button>
        </div>

        {aba === "senso" ? (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-bold text-white">Filtros de Senso</h3>
                <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300">
                  {totalFiltrosSenso} ativos
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <label className="block text-sm text-slate-300 lg:col-span-2">
                  <span className="mb-1 block">Questionario de Senso</span>
                  <select
                    value={senso.questionarioId}
                    onChange={(event) => senso.setQuestionarioId(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  >
                    <option value="">Selecione</option>
                    {senso.questionarios.map((item) => (
                      <option key={item.id} value={item.id}>{item.titulo}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Estado</span>
                  <select
                    value={String(sensoFilters.estado ?? "")}
                    onChange={(event) => patchFilters("senso", { estado: event.target.value, cidade: "", offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  >
                    <option value="">Todos</option>
                    {estados.map((e) => (
                      <option key={e.sigla} value={e.sigla}>{e.sigla} — {e.nome}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Cidade</span>
                  <select
                    value={String(sensoFilters.cidade ?? "")}
                    onChange={(event) => patchFilters("senso", { cidade: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                    disabled={!sensoFilters.estado || loadingCidadesSenso}
                  >
                    <option value="">{loadingCidadesSenso ? "Carregando..." : "Todas"}</option>
                    {cidadesSenso.map((c) => (
                      <option key={c.id} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Bairro</span>
                  <input
                    value={String(sensoFilters.bairro ?? "")}
                    onChange={(event) => patchFilters("senso", { bairro: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                    placeholder="Centro, Liberdade"
                  />
                </label>

                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Nome</span>
                  <input
                    value={String(sensoFilters.nome ?? "")}
                    onChange={(event) => patchFilters("senso", { nome: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                    placeholder="Nome do participante"
                  />
                </label>

                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Contato</span>
                  <input
                    value={String(sensoFilters.contato ?? "")}
                    onChange={(event) => patchFilters("senso", { contato: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                    placeholder="Telefone"
                  />
                </label>

                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">IP</span>
                  <input
                    value={String(sensoFilters.ip ?? "")}
                    onChange={(event) => patchFilters("senso", { ip: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                    placeholder="192.168.1.1"
                  />
                </label>

                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Participante ID</span>
                  <input
                    value={String(sensoFilters.participanteId ?? "")}
                    onChange={(event) => patchFilters("senso", { participanteId: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                    placeholder="UUID ou lista por virgula"
                  />
                </label>

                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Entrevistador ID</span>
                  <input
                    value={String(sensoFilters.entrevistadorId ?? "")}
                    onChange={(event) => patchFilters("senso", { entrevistadorId: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                    placeholder="UUID ou lista por virgula"
                  />
                </label>

                <label className="block text-sm text-slate-300 xl:col-span-2">
                  <span className="mb-1 block">Pergunta</span>
                  <select
                    value={String(sensoFilters.perguntaId ?? "")}
                    onChange={(event) => patchFilters("senso", { perguntaId: event.target.value, opcaoId: "", offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                    disabled={sensoPerguntas.length === 0}
                  >
                    <option value="">Todas</option>
                    {sensoPerguntas.map((item) => (
                      <option key={item.id} value={item.id}>{item.texto}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-300 xl:col-span-2">
                  <span className="mb-1 block">Opcao</span>
                  <select
                    value={String(sensoFilters.opcaoId ?? "")}
                    onChange={(event) => patchFilters("senso", { opcaoId: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                    disabled={sensoOpcoes.length === 0}
                  >
                    <option value="">Todas</option>
                    {sensoOpcoes.map((item) => (
                      <option key={item.id} value={item.id}>{item.texto}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Respondido de</span>
                  <input
                    type="date"
                    value={String(sensoFilters.respondidoDe ?? "")}
                    onChange={(event) => patchFilters("senso", { respondidoDe: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  />
                </label>

                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Respondido ate</span>
                  <input
                    type="date"
                    value={String(sensoFilters.respondidoAte ?? "")}
                    onChange={(event) => patchFilters("senso", { respondidoAte: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  />
                </label>

                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Itens por pagina</span>
                  <select
                    value={String(sensoFilters.limit ?? 20)}
                    onChange={(event) => patchFilters("senso", { limit: Number(event.target.value), offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  >
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/45 px-3 py-3 text-sm text-slate-300 xl:col-span-2">
                  <input
                    type="checkbox"
                    checked={Boolean(sensoFilters.apenasComCoordenada)}
                    onChange={(event) => patchFilters("senso", { apenasComCoordenada: event.target.checked, offset: 0 })}
                    className="h-4 w-4 rounded border-white/15 bg-slate-950/65 text-cyan-400"
                  />
                  <span>Apenas respostas com geolocalizacao</span>
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => void senso.refetch()} className="bg-cyan-500 text-slate-950">Atualizar</Button>
                <Button type="button" onClick={() => clearFilters("senso")} className="border border-white/20 bg-white/5 text-slate-200">Limpar filtros</Button>
              </div>
            </div>

            {senso.state === "loading" ? <StateBox text="Carregando dashboard de senso..." /> : null}
            {senso.state === "error" ? <StateBox text={senso.error || "Falha ao carregar dashboard de senso."} tone="error" /> : null}
            {senso.state === "success" && !senso.hasData ? <StateBox text="Nenhum dado encontrado para os filtros atuais." tone="empty" /> : null}

            {senso.resumo ? (
              <div className="grid gap-4 lg:grid-cols-4">
                <KpiCard label="Respostas filtradas" value={String(senso.resumo.totalRespostasFiltradas)} />
                <KpiCard label="Perguntas" value={String(senso.resumo.resultado.length)} />
                <KpiCard label="Filtros backend" value={String(Object.keys(senso.resumo.filtrosAplicados ?? {}).length)} />
                <KpiCard label="Questionario" value={senso.resumo.titulo} />
              </div>
            ) : null}

            {demographicCharts.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-bold text-white">Perfil Sociodemografico (Recharts)</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Visualizacao dos campos: faixa etaria, genero, escolaridade, renda, trabalho, estado civil, religiao e raca/cor.
                </p>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {demographicCharts.map((chart) => (
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

            {senso.participantes ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-white">Participantes (paginado)</h3>
                  <span className="text-xs text-slate-400">
                    Offset: {Number(sensoFilters.offset ?? 0)} | Limite: {Number(sensoFilters.limit ?? 20)}
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
                        <th className="px-2 py-2">Coordenada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {senso.participantes.respostas.map((item) => (
                        <tr key={item.id} className="border-b border-white/5">
                          <td className="px-2 py-2">{formatDate(item.respondidoEm)}</td>
                          <td className="px-2 py-2">{item.participante?.nome || "-"}</td>
                          <td className="px-2 py-2">{item.participante?.contatoOpcional || "-"}</td>
                          <td className="px-2 py-2">{[item.estado, item.cidade, item.bairro].filter(Boolean).join(" / ") || "-"}</td>
                          <td className="px-2 py-2">{item.entrevistador?.nome || "-"}</td>
                          <td className="px-2 py-2">{item.coordenada?.latitude != null && item.coordenada?.longitude != null ? "Sim" : "Nao"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    onClick={() => patchFilters("senso", { offset: Math.max(Number(sensoFilters.offset ?? 0) - Number(sensoFilters.limit ?? 20), 0) })}
                    disabled={Number(sensoFilters.offset ?? 0) <= 0}
                    className="border border-white/20 bg-white/5 text-slate-200"
                  >
                    Pagina anterior
                  </Button>
                  <Button
                    type="button"
                    onClick={() => patchFilters("senso", { offset: Number(sensoFilters.offset ?? 0) + Number(sensoFilters.limit ?? 20) })}
                    disabled={!senso.participantes.paginacao?.temMais}
                    className="border border-white/20 bg-white/5 text-slate-200"
                  >
                    Proxima pagina
                  </Button>
                </div>
              </div>
            ) : null}

            {heatPoints.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-bold text-white">Mapa de Calor (coordenadas)</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Mapa publico com intensidade por latitude/longitude das entrevistas realizadas.
                </p>
                <div className="mt-3">
                  <SensoHeatMap points={heatPoints} />
                </div>
              </div>
            ) : null}

            <IaCardsBlock
              analise={senso.analiseIa}
              onRequest={handleGerarRelatorioIaSenso}
              loading={loadingSensoIa}
              error={iaError}
            />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-bold text-white">Filtros de Big Five</h3>
                <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300">
                  {totalFiltrosBigFive} ativos
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Classificacao</span>
                  <input
                    value={String(bigFiveFilters.classificacao ?? "")}
                    onChange={(event) => patchFilters("bigfive", { classificacao: event.target.value, offset: 0 })}
                    list="bigfive-classificacao-options"
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  />
                  <datalist id="bigfive-classificacao-options">
                    {bigFiveClassificacaoOptions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Estado</span>
                  <select
                    value={String(bigFiveFilters.estado ?? "")}
                    onChange={(event) => patchFilters("bigfive", { estado: event.target.value, cidade: "", offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  >
                    <option value="">Todos</option>
                    {estados.map((e) => (
                      <option key={e.sigla} value={e.sigla}>{e.sigla} — {e.nome}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Cidade</span>
                  <select
                    value={String(bigFiveFilters.cidade ?? "")}
                    onChange={(event) => patchFilters("bigfive", { cidade: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                    disabled={!bigFiveFilters.estado || loadingCidadesBigFive}
                  >
                    <option value="">{loadingCidadesBigFive ? "Carregando..." : "Todas"}</option>
                    {cidadesBigFive.map((c) => (
                      <option key={c.id} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Bairro</span>
                  <input
                    value={String(bigFiveFilters.bairro ?? "")}
                    onChange={(event) => patchFilters("bigfive", { bairro: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                    placeholder="Centro, Liberdade"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Questionario Senso ID</span>
                  <input
                    value={String(bigFiveFilters.questionarioId ?? "")}
                    onChange={(event) => patchFilters("bigfive", { questionarioId: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Nome</span>
                  <input
                    value={String(bigFiveFilters.nome ?? "")}
                    onChange={(event) => patchFilters("bigfive", { nome: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                    placeholder="Nome do participante"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Contato</span>
                  <input
                    value={String(bigFiveFilters.contato ?? "")}
                    onChange={(event) => patchFilters("bigfive", { contato: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                    placeholder="Telefone"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">IP</span>
                  <input
                    value={String(bigFiveFilters.ip ?? "")}
                    onChange={(event) => patchFilters("bigfive", { ip: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                    placeholder="192.168.1.1"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Participante ID</span>
                  <input
                    value={String(bigFiveFilters.participanteId ?? "")}
                    onChange={(event) => patchFilters("bigfive", { participanteId: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                    placeholder="UUID ou lista por virgula"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Entrevistador ID</span>
                  <input
                    value={String(bigFiveFilters.entrevistadorId ?? "")}
                    onChange={(event) => patchFilters("bigfive", { entrevistadorId: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                    placeholder="UUID ou lista por virgula"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Respondido de</span>
                  <input
                    type="date"
                    value={String(bigFiveFilters.respondidoDe ?? "")}
                    onChange={(event) => patchFilters("bigfive", { respondidoDe: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Respondido ate</span>
                  <input
                    type="date"
                    value={String(bigFiveFilters.respondidoAte ?? "")}
                    onChange={(event) => patchFilters("bigfive", { respondidoAte: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Abertura min</span>
                  <input
                    type="number"
                    value={String(bigFiveFilters.aberturaMin ?? "")}
                    onChange={(event) => patchFilters("bigfive", { aberturaMin: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Abertura max</span>
                  <input
                    type="number"
                    value={String(bigFiveFilters.aberturaMax ?? "")}
                    onChange={(event) => patchFilters("bigfive", { aberturaMax: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Consciencia min</span>
                  <input
                    type="number"
                    value={String(bigFiveFilters.conscienciaMin ?? "")}
                    onChange={(event) => patchFilters("bigfive", { conscienciaMin: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Consciencia max</span>
                  <input
                    type="number"
                    value={String(bigFiveFilters.conscienciaMax ?? "")}
                    onChange={(event) => patchFilters("bigfive", { conscienciaMax: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Extroversao min</span>
                  <input
                    type="number"
                    value={String(bigFiveFilters.extroversaoMin ?? "")}
                    onChange={(event) => patchFilters("bigfive", { extroversaoMin: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Extroversao max</span>
                  <input
                    type="number"
                    value={String(bigFiveFilters.extroversaoMax ?? "")}
                    onChange={(event) => patchFilters("bigfive", { extroversaoMax: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Amabilidade min</span>
                  <input
                    type="number"
                    value={String(bigFiveFilters.amabilidadeMin ?? "")}
                    onChange={(event) => patchFilters("bigfive", { amabilidadeMin: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Amabilidade max</span>
                  <input
                    type="number"
                    value={String(bigFiveFilters.amabilidadeMax ?? "")}
                    onChange={(event) => patchFilters("bigfive", { amabilidadeMax: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Neuroticismo min</span>
                  <input
                    type="number"
                    value={String(bigFiveFilters.neuroticismoMin ?? "")}
                    onChange={(event) => patchFilters("bigfive", { neuroticismoMin: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Neuroticismo max</span>
                  <input
                    type="number"
                    value={String(bigFiveFilters.neuroticismoMax ?? "")}
                    onChange={(event) => patchFilters("bigfive", { neuroticismoMax: event.target.value, offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block">Itens por pagina</span>
                  <select
                    value={String(bigFiveFilters.limit ?? 20)}
                    onChange={(event) => patchFilters("bigfive", { limit: Number(event.target.value), offset: 0 })}
                    className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                  >
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/45 px-3 py-3 text-sm text-slate-300 xl:col-span-2">
                  <input
                    type="checkbox"
                    checked={Boolean(bigFiveFilters.apenasComCoordenada)}
                    onChange={(event) => patchFilters("bigfive", { apenasComCoordenada: event.target.checked, offset: 0 })}
                    className="h-4 w-4 rounded border-white/15 bg-slate-950/65 text-cyan-400"
                  />
                  <span>Apenas participantes com geolocalizacao</span>
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => void bigfive.refetch()} className="bg-cyan-500 text-slate-950">Atualizar</Button>
                <Button type="button" onClick={() => clearFilters("bigfive")} className="border border-white/20 bg-white/5 text-slate-200">Limpar filtros</Button>
              </div>
            </div>

            {bigfive.state === "loading" ? <StateBox text="Carregando dashboard Big Five..." /> : null}
            {bigfive.state === "error" ? <StateBox text={bigfive.error || "Falha ao carregar dashboard Big Five."} tone="error" /> : null}
            {bigfive.state === "success" && !bigfive.hasData ? <StateBox text="Nenhum dado encontrado para os filtros atuais." tone="empty" /> : null}

            {bigfive.resumo?.resumo ? (
              <div className="grid gap-4 lg:grid-cols-4">
                <KpiCard label="Participantes com BigFive" value={String(bigfive.resumo.resumo.totalParticipantesComBigFive ?? 0)} />
                <KpiCard label="Participantes com Senso" value={String(bigfive.resumo.resumo.totalParticipantesComSenso ?? 0)} />
                <KpiCard label="Classificacoes" value={String(Object.keys(bigfive.resumo.resumo.distribuicaoClassificacao ?? {}).length)} />
                <KpiCard label="Medias de tracos" value={String(Object.keys(bigfive.resumo.resumo.medias ?? {}).length)} />
              </div>
            ) : null}

            {bigFiveClassificacaoData.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-bold text-white">Distribuicao de Classificacao (Recharts)</h3>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <article className="min-w-0 rounded-xl border border-white/10 bg-slate-950/45 p-4">
                    <h4 className="text-sm font-semibold text-white">Total por classificacao</h4>
                    <div className="mt-3 min-w-0 w-full">
                      <ResponsiveContainer width="100%" height={280} minWidth={0}>
                        <BarChart data={bigFiveClassificacaoData} margin={{ top: 8, right: 8, left: 0, bottom: 36 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                          <XAxis
                            dataKey="classificacao"
                            stroke="#94a3b8"
                            angle={-10}
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

                  <article className="min-w-0 rounded-xl border border-white/10 bg-slate-950/45 p-4">
                    <h4 className="text-sm font-semibold text-white">Media por traco</h4>
                    <div className="mt-3 min-w-0 w-full">
                      <ResponsiveContainer width="100%" height={280} minWidth={0}>
                        <BarChart data={bigFiveMediasData} margin={{ top: 8, right: 8, left: 0, bottom: 36 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                          <XAxis
                            dataKey="traco"
                            stroke="#94a3b8"
                            angle={-12}
                            textAnchor="end"
                            interval={0}
                            height={56}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                          <Tooltip
                            cursor={{ fill: "rgba(168,85,247,0.12)" }}
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              borderColor: "rgba(148,163,184,0.35)",
                              borderRadius: 10,
                              color: "#e2e8f0",
                            }}
                          />
                          <Bar dataKey="media" fill="#a855f7" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </article>
                </div>
              </div>
            ) : null}

            {bigfive.resumo?.participantes?.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-white">Participantes Big Five (paginado)</h3>
                  <span className="text-xs text-slate-400">
                    Offset: {Number(bigFiveFilters.offset ?? 0)} | Limite: {Number(bigFiveFilters.limit ?? 20)}
                  </span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-200">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="px-2 py-2">Participante</th>
                        <th className="px-2 py-2">Contato</th>
                        <th className="px-2 py-2">Classificacao</th>
                        <th className="px-2 py-2">Abertura</th>
                        <th className="px-2 py-2">Consciencia</th>
                        <th className="px-2 py-2">Extroversao</th>
                        <th className="px-2 py-2">Amabilidade</th>
                        <th className="px-2 py-2">Neuroticismo</th>
                        <th className="px-2 py-2">Cidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bigfive.resumo.participantes.map((item, index) => (
                        <tr
                          key={`${item.participante?.id ?? index}-bigfive`}
                          className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
                          onClick={() => openBigFiveParticipantDetail(item)}
                        >
                          <td className="px-2 py-2">{item.participante?.nome || "-"}</td>
                          <td className="px-2 py-2">{item.participante?.contatoOpcional || "-"}</td>
                          <td className="px-2 py-2">{item.resultado?.classificacao || "-"}</td>
                          <td className="px-2 py-2">{item.metricas?.abertura ?? "-"}</td>
                          <td className="px-2 py-2">{item.metricas?.consciencia ?? "-"}</td>
                          <td className="px-2 py-2">{item.metricas?.extroversao ?? "-"}</td>
                          <td className="px-2 py-2">{item.metricas?.amabilidade ?? "-"}</td>
                          <td className="px-2 py-2">{item.metricas?.neuroticismo ?? "-"}</td>
                          <td className="px-2 py-2">{item.sensoPopulacional?.cidade || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    onClick={() => patchFilters("bigfive", { offset: Math.max(Number(bigFiveFilters.offset ?? 0) - Number(bigFiveFilters.limit ?? 20), 0) })}
                    disabled={Number(bigFiveFilters.offset ?? 0) <= 0}
                    className="border border-white/20 bg-white/5 text-slate-200"
                  >
                    Pagina anterior
                  </Button>
                  <Button
                    type="button"
                    onClick={() => patchFilters("bigfive", { offset: Number(bigFiveFilters.offset ?? 0) + Number(bigFiveFilters.limit ?? 20) })}
                    disabled={!bigfive.resumo.paginacao?.temMais}
                    className="border border-white/20 bg-white/5 text-slate-200"
                  >
                    Proxima pagina
                  </Button>
                </div>
              </div>
            ) : null}

            {bigFiveHeatPoints.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-bold text-white">Mapa de Calor Big Five (coordenadas)</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Intensidade por latitude/longitude de participantes com resultado Big Five.
                </p>
                <div className="mt-3">
                  <SensoHeatMap points={bigFiveHeatPoints} />
                </div>
              </div>
            ) : null}

            <IaCardsBlock
              analise={bigfive.analiseIa}
              onRequest={handleGerarRelatorioIaBigFive}
              loading={loadingBigFiveIa}
              error={iaError}
            />

            <BigFiveParticipantDetailDrawer
              participant={selectedBigFiveParticipant}
              activeTab={bigFiveDetailTab}
              onTabChange={setBigFiveDetailTab}
              onClose={closeBigFiveParticipantDetail}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function BigFiveParticipantDetailDrawer({
  participant,
  activeTab,
  onTabChange,
  onClose,
}: {
  participant: BigFiveParticipant | null;
  activeTab: BigFiveDetailTab;
  onTabChange: (tab: BigFiveDetailTab) => void;
  onClose: () => void;
}) {
  if (!participant) {
    return null;
  }

  const hasBigFive = Boolean(participant.resultado);
  const hasSenso = Boolean(participant.sensoPopulacional);

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar detalhe do participante"
        className="fixed inset-0 z-[70] bg-slate-950/70"
      />
      <aside className="fixed inset-y-0 right-0 z-[71] flex h-full w-full max-w-3xl flex-col border-l border-white/10 bg-slate-950 shadow-2xl shadow-slate-950/60">
        <div className="border-b border-white/10 px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Detalhe do participante</p>
              <h3 className="mt-2 truncate text-xl font-black text-white">
                {participant.participante?.nome || "Participante sem nome"}
              </h3>
              <p className="mt-1 text-sm text-slate-400">{participant.participante?.contatoOpcional || "Contato nao informado"}</p>
            </div>
            <Button type="button" onClick={onClose} className="border border-white/15 bg-white/5 text-slate-200">
              Fechar
            </Button>
          </div>

          <div className="mt-4 flex w-full flex-wrap rounded-2xl border border-white/10 bg-slate-900/70 p-1">
            <button
              type="button"
              onClick={() => onTabChange("bigfive")}
              disabled={!hasBigFive}
              className={[
                "min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                activeTab === "bigfive"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40",
              ].join(" ")}
            >
              Perfil Big Five
            </button>
            <button
              type="button"
              onClick={() => onTabChange("senso")}
              className={[
                "min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                activeTab === "senso"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-200 hover:bg-white/5",
              ].join(" ")}
            >
              Senso Populacional
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {activeTab === "bigfive" ? (
            hasBigFive ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <KpiCard label="Classificacao" value={participant.resultado?.classificacao || "-"} />
                  <KpiCard label="Respondido em" value={formatDate(participant.resultado?.respondidoEm)} />
                  <KpiCard label="Entrevistador" value={participant.resultado?.entrevistador?.nome || "-"} />
                </div>

                {participant.resultado?.interpretacao ? (
                  <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-300">Interpretacao</h4>
                    <p className="mt-3 text-sm leading-6 text-slate-200">{participant.resultado.interpretacao}</p>
                  </section>
                ) : null}

                <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-300">Metricas Big Five</h4>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <KpiCard label="Abertura" value={String(participant.metricas?.abertura ?? "-")} />
                    <KpiCard label="Consciencia" value={String(participant.metricas?.consciencia ?? "-")} />
                    <KpiCard label="Extroversao" value={String(participant.metricas?.extroversao ?? "-")} />
                    <KpiCard label="Amabilidade" value={String(participant.metricas?.amabilidade ?? "-")} />
                    <KpiCard label="Neuroticismo" value={String(participant.metricas?.neuroticismo ?? "-")} />
                  </div>
                </section>
              </div>
            ) : (
              <StateBox text="Participante sem resultado Big Five vinculado." tone="empty" />
            )
          ) : hasSenso ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Estado" value={participant.sensoPopulacional?.estado || "-"} />
                <KpiCard label="Cidade" value={participant.sensoPopulacional?.cidade || "-"} />
                <KpiCard label="Bairro" value={participant.sensoPopulacional?.bairro || "-"} />
                <KpiCard label="Questionario" value={participant.sensoPopulacional?.questionario?.titulo || "-"} />
              </div>

              <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-300">Respostas do Senso</h4>
                  <span className="text-xs text-slate-400">Respondido em {formatDate(participant.sensoPopulacional?.respondidoEm)}</span>
                </div>

                {participant.sensoPopulacional?.respostas?.length ? (
                  <div className="mt-4 space-y-3">
                    {participant.sensoPopulacional.respostas.map((answer, index) => (
                      <article key={answer.id ?? `${answer.pergunta?.id ?? index}-${index}`} className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
                        <p className="text-sm font-semibold text-white">{answer.pergunta?.texto || "Pergunta sem titulo"}</p>
                        <p className="mt-2 text-sm text-slate-300">{answer.opcao?.texto || "Opcao nao informada"}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-slate-300">
                    Respostas do senso nao disponiveis para este participante.
                  </div>
                )}
              </section>
            </div>
          ) : (
            <StateBox text="Participante sem resposta de senso vinculada" tone="empty" />
          )}
        </div>
      </aside>
    </>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(150deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 truncate text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function StateBox({ text, tone = "info" }: { text: string; tone?: "info" | "error" | "empty" }) {
  const className =
    tone === "error"
      ? "border-rose-300/30 bg-rose-500/10 text-rose-100"
      : tone === "empty"
        ? "border-amber-300/30 bg-amber-500/10 text-amber-100"
        : "border-cyan-300/30 bg-cyan-500/10 text-cyan-100";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${className}`}>{text}</div>;
}

function IaCardsBlock({
  analise,
  onRequest,
  loading,
  error,
}: {
  analise: Record<string, unknown> | null;
  onRequest: () => Promise<void>;
  loading: boolean;
  error: string;
}) {
  const cards = analise?.cards && typeof analise.cards === "object" ? (analise.cards as Record<string, unknown>) : null;
  const resumoExecutivo = Array.isArray(analise?.resumoExecutivo) ? (analise.resumoExecutivo as string[]) : [];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">Relatorio IA</h3>
          <p className="mt-1 text-xs text-slate-400">Insights processados pelo backend para suporte a decisao.</p>
        </div>
        <Button
          type="button"
          onClick={() => void onRequest()}
          disabled={loading}
          className="bg-cyan-500 text-slate-950"
        >
          {loading ? "Gerando..." : "Gerar relatorio IA"}
        </Button>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {!analise ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-slate-300">
          Clique em &quot;Gerar relatorio IA&quot; para chamar a rota de relatorio e carregar os insights.
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/45 p-4">
          <h4 className="text-sm font-bold text-cyan-300">Resumo executivo</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
            {resumoExecutivo.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
