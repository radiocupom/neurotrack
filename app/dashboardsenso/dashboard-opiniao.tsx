"use client";

import { useMemo } from "react";
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

export type DashboardOpiniaoProps = {
  loggedUser: AuthUser;
};

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
