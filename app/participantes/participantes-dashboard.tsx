"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getBrowserCache, setBrowserCache } from "@/lib/cache/browser-cache";
import {
  listarParticipantesComPesquisasAction,
  obterParticipanteComPesquisasAction,
} from "@/app/participantes/participantes-actions";
import type {
  ParticipanteComPesquisas,
  RespostaBigFive,
  RespostaPesquisaOpiniao,
  RespostaSenso,
  VotoParticipante,
} from "@/service/participantes.service";
import { ParticipanteLocationMap } from "@/app/participantes/participante-location-map";

type LocalizacaoResumo = {
  lat: number;
  lng: number;
  fonte: "opiniao" | "senso" | "bigfive" | "voto";
  label: string;
  data: string;
};

type ParticipanteResumo = {
  id: string;
  nome: string;
  email: string | null;
  contato: string | null;
  criadoEm: string | null;
  totais: {
    bigfive: number;
    opiniao: number;
    senso: number;
    votos: number;
    total: number;
  };
};

const PARTICIPANTES_LIST_CACHE_KEY = "participantes::com-pesquisas::list";
const PARTICIPANTES_DETAIL_CACHE_KEY_PREFIX = "participantes::com-pesquisas::detail::";
const PARTICIPANTES_BROWSER_TTL = 5 * 60 * 1000;

function readObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asRespostaBigFiveArray(value: unknown): RespostaBigFive[] {
  return readArray(value) as RespostaBigFive[];
}

function asRespostaOpiniaoArray(value: unknown): RespostaPesquisaOpiniao[] {
  return readArray(value) as RespostaPesquisaOpiniao[];
}

function asRespostaSensoArray(value: unknown): RespostaSenso[] {
  return readArray(value) as RespostaSenso[];
}

function asVotosArray(value: unknown): VotoParticipante[] {
  return readArray(value) as VotoParticipante[];
}

function normalizeParticipante(item: unknown): ParticipanteComPesquisas | null {
  const raw = readObject(item);
  if (!raw) {
    return null;
  }

  const id = readString(raw.id);
  if (!id) {
    return null;
  }

  return {
    id,
    nome: readString(raw.nome) || "Participante sem nome",
    email: readNullableString(raw.email),
    telefone: readNullableString(raw.telefone),
    contatoOpcional: readNullableString(raw.contatoOpcional),
    criadoEm: readNullableString(raw.criadoEm),
    respostasBigFive: asRespostaBigFiveArray(raw.respostasBigFive),
    respostasPesquisas: asRespostaOpiniaoArray(raw.respostasPesquisas),
    respostasSenso: asRespostaSensoArray(raw.respostasSenso),
    votos: asVotosArray(raw.votos),
  };
}

function asTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function extractLatestLocation(participante: ParticipanteComPesquisas | null): LocalizacaoResumo | null {
  if (!participante) {
    return null;
  }

  const points: LocalizacaoResumo[] = [];

  participante.respostasPesquisas?.forEach((item) => {
    const lat = readNumber(item.latitude);
    const lng = readNumber(item.longitude);
    if (lat == null || lng == null) {
      return;
    }

    points.push({
      lat,
      lng,
      fonte: "opiniao",
      label: `Opiniao: ${item.pesquisa?.titulo || "Pesquisa"}`,
      data: item.respondidoEm,
    });
  });

  participante.respostasSenso?.forEach((item) => {
    const lat = readNumber(item.latitude);
    const lng = readNumber(item.longitude);
    if (lat == null || lng == null) {
      return;
    }

    points.push({
      lat,
      lng,
      fonte: "senso",
      label: `Senso: ${item.questionario?.titulo || "Questionario"}`,
      data: item.respondidoEm,
    });
  });

  participante.respostasBigFive?.forEach((item) => {
    const lat = readNumber(item.latitude);
    const lng = readNumber(item.longitude);
    if (lat == null || lng == null) {
      return;
    }

    points.push({
      lat,
      lng,
      fonte: "bigfive",
      label: `Big Five: ${item.classificacao || "Classificacao"}`,
      data: item.respondidoEm,
    });
  });

  participante.votos?.forEach((item) => {
    const lat = readNumber(item.latitude);
    const lng = readNumber(item.longitude);
    if (lat == null || lng == null) {
      return;
    }

    points.push({
      lat,
      lng,
      fonte: "voto",
      label: `Voto: ${item.candidato?.nome || "Candidato"}`,
      data: item.criadoEm,
    });
  });

  if (!points.length) {
    return null;
  }

  points.sort((a, b) => asTimestamp(b.data) - asTimestamp(a.data));
  return points[0] ?? null;
}

function avg(a: number, b: number, c: number) {
  return Number(((a + b + c) / 3).toFixed(2));
}

function toResumo(item: ParticipanteComPesquisas): ParticipanteResumo {
  const totais = {
    bigfive: item.respostasBigFive?.length ?? 0,
    opiniao: item.respostasPesquisas?.length ?? 0,
    senso: item.respostasSenso?.length ?? 0,
    votos: item.votos?.length ?? 0,
    total:
      (item.respostasBigFive?.length ?? 0)
      + (item.respostasPesquisas?.length ?? 0)
      + (item.respostasSenso?.length ?? 0)
      + (item.votos?.length ?? 0),
  };

  return {
    id: item.id,
    nome: item.nome,
    email: item.email ?? null,
    contato: item.contatoOpcional ?? item.telefone ?? null,
    criadoEm: item.criadoEm ?? null,
    totais,
  };
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

function detailCacheKey(id: string) {
  return `${PARTICIPANTES_DETAIL_CACHE_KEY_PREFIX}${id}`;
}

export function ParticipantesDashboard() {
  const [allParticipantes, setAllParticipantes] = useState<ParticipanteComPesquisas[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<ParticipanteComPesquisas | null>(null);
  const [mobileView, setMobileView] = useState<"lista" | "detalhe">("lista");
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");

  const listResumo = useMemo(() => allParticipantes.map(toResumo), [allParticipantes]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return listResumo;
    }

    return listResumo.filter((item) => {
      const stack = [item.nome, item.email ?? "", item.contato ?? "", item.id].join(" ").toLowerCase();
      return stack.includes(term);
    });
  }, [listResumo, search]);

  const selectedResumo = useMemo(
    () => filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  const loadDetail = useCallback(async (id: string) => {
    if (!id) {
      return;
    }

    setLoadingDetail(true);

    const cached = getBrowserCache<ParticipanteComPesquisas>(detailCacheKey(id));
    if (cached) {
      const normalizedCached = normalizeParticipante(cached);
      if (normalizedCached) {
        setSelectedDetail(normalizedCached);
      }
    }

    const result = await obterParticipanteComPesquisasAction(id);
    if (!result.ok || !result.data) {
      setLoadingDetail(false);
      if (!cached) {
        setError(result.message || "Falha ao carregar detalhes do participante.");
      }
      return;
    }

    const normalized = normalizeParticipante(result.data);
    if (normalized) {
      setSelectedDetail(normalized);
      setBrowserCache(detailCacheKey(id), normalized, { ttl: PARTICIPANTES_BROWSER_TTL });
    }

    setLoadingDetail(false);
  }, []);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setError("");

    const cached = getBrowserCache<ParticipanteComPesquisas[]>(PARTICIPANTES_LIST_CACHE_KEY);
    if (cached && cached.length > 0) {
      const normalizedCached = cached
        .map(normalizeParticipante)
        .filter((item): item is ParticipanteComPesquisas => item != null);
      setAllParticipantes(normalizedCached);
      if (!selectedId && normalizedCached[0]?.id) {
        setSelectedId(normalizedCached[0].id);
        void loadDetail(normalizedCached[0].id);
      }
    }

    const result = await listarParticipantesComPesquisasAction();

    if (!result.ok || !result.data) {
      setLoadingList(false);
      if (!cached) {
        setError(result.message || "Falha ao carregar participantes.");
      }
      return;
    }

    const normalized = result.data.map(normalizeParticipante).filter((item): item is ParticipanteComPesquisas => item != null);
    setAllParticipantes(normalized);
    if (!selectedId && normalized[0]?.id) {
      setSelectedId(normalized[0].id);
      void loadDetail(normalized[0].id);
    }
    setBrowserCache(PARTICIPANTES_LIST_CACHE_KEY, normalized, { ttl: PARTICIPANTES_BROWSER_TTL });
    setLoadingList(false);
  }, [loadDetail, selectedId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadList();
    }, 0);

    return () => window.clearTimeout(handle);
  }, [loadList]);

  const totalRegistros = useMemo(() => {
    return listResumo.reduce((acc, item) => acc + item.totais.total, 0);
  }, [listResumo]);

  const latestLocation = useMemo(() => extractLatestLocation(selectedDetail), [selectedDetail]);

  return (
    <section className="flex min-w-0 flex-1 flex-col p-3 sm:p-6 lg:p-8">
      <div className="min-w-0 rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(8,15,31,0.88),rgba(15,23,42,0.78))] p-4 shadow-2xl shadow-slate-950/40 sm:p-6">
        <header className="border-b border-white/10 pb-6">
          <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200">
            Participantes
          </div>
          <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">Participantes e Pesquisas Associadas</h2>
          <p className="mt-2 text-sm text-slate-300">Listagem unificada com cache local e detalhe consolidado de respostas por participante.</p>
        </header>

        {error ? (
          <div className="mt-5 rounded-xl border border-rose-300/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/40 p-1 xl:hidden">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setMobileView("lista")}
              className={[
                "h-10 rounded-lg text-sm font-semibold transition",
                mobileView === "lista"
                  ? "bg-cyan-400/20 text-cyan-100"
                  : "bg-transparent text-slate-300 hover:bg-white/5",
              ].join(" ")}
            >
              Lista
            </button>
            <button
              type="button"
              onClick={() => setMobileView("detalhe")}
              className={[
                "h-10 rounded-lg text-sm font-semibold transition",
                mobileView === "detalhe"
                  ? "bg-cyan-400/20 text-cyan-100"
                  : "bg-transparent text-slate-300 hover:bg-white/5",
              ].join(" ")}
            >
              Detalhe
            </button>
          </div>
          <p className="mt-2 px-2 text-xs text-slate-400">
            {selectedResumo ? `Selecionado: ${selectedResumo.nome}` : "Nenhum participante selecionado"}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <KpiCard label="Participantes" value={String(listResumo.length)} />
          <KpiCard label="Registros totais" value={String(totalRegistros)} />
          <KpiCard
            label="Big Five"
            value={String(listResumo.reduce((acc, item) => acc + item.totais.bigfive, 0))}
          />
          <KpiCard
            label="Senso + Opiniao + Votos"
            value={String(
              listResumo.reduce(
                (acc, item) => acc + item.totais.senso + item.totais.opiniao + item.totais.votos,
                0,
              ),
            )}
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div
            className={[
              "rounded-2xl border border-white/10 bg-white/5 p-4",
              mobileView === "lista" ? "block" : "hidden xl:block",
            ].join(" ")}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-white">Lista de participantes</h3>
              <Button
                type="button"
                onClick={() => void loadList()}
                className="h-9 rounded-lg border border-white/20 bg-white/5 px-3 text-slate-200"
              >
                {loadingList ? "Atualizando..." : "Atualizar"}
              </Button>
            </div>

            <div className="mt-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100"
                placeholder="Buscar por nome, email, contato ou ID"
              />
            </div>

            <div className="mt-4 space-y-2 md:hidden">
              {filtered.map((item) => {
                const active = item.id === selectedId;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                      setMobileView("detalhe");
                      void loadDetail(item.id);
                    }}
                    className={[
                      "w-full rounded-xl border px-3 py-3 text-left transition",
                      active
                        ? "border-cyan-300/30 bg-cyan-500/10"
                        : "border-white/10 bg-slate-950/45 hover:bg-white/5",
                    ].join(" ")}
                  >
                    <p className="text-sm font-bold text-white">{item.nome}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.contato || item.email || "-"}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
                      Total de registros: {item.totais.total}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 hidden max-h-[28rem] overflow-auto rounded-xl border border-white/10 md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Nome</th>
                    <th className="px-3 py-2 font-semibold">Contato</th>
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const active = item.id === selectedId;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => {
                          setSelectedId(item.id);
                          setMobileView("detalhe");
                          void loadDetail(item.id);
                        }}
                        className={[
                          "cursor-pointer border-t border-white/10 text-slate-200",
                          active ? "bg-cyan-500/10" : "hover:bg-white/5",
                        ].join(" ")}
                      >
                        <td className="px-3 py-2 font-semibold">{item.nome}</td>
                        <td className="px-3 py-2 text-slate-400">{item.contato || item.email || "-"}</td>
                        <td className="px-3 py-2 text-right font-bold">{item.totais.total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div
            className={[
              "rounded-2xl border border-white/10 bg-white/5 p-4",
              mobileView === "detalhe" ? "block" : "hidden xl:block",
            ].join(" ")}
          >
            <h3 className="text-lg font-bold text-white">Dashboard do participante</h3>
            <button
              type="button"
              onClick={() => setMobileView("lista")}
              className="mt-2 inline-flex h-9 items-center rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-slate-200 xl:hidden"
            >
              Voltar para lista
            </button>

            {!selectedResumo ? (
              <p className="mt-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-300">
                Nenhum participante encontrado para os filtros atuais.
              </p>
            ) : (
              <>
                <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-sm text-slate-300">Nome</p>
                  <p className="text-xl font-black text-white">{selectedResumo.nome}</p>
                  <p className="mt-1 text-xs text-slate-400">ID: {selectedResumo.id}</p>
                  <p className="mt-1 text-xs text-slate-400">Criado em: {formatDate(selectedResumo.criadoEm)}</p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <KpiCard label="Big Five" value={String(selectedResumo.totais.bigfive)} />
                  <KpiCard label="Opiniao" value={String(selectedResumo.totais.opiniao)} />
                  <KpiCard label="Senso" value={String(selectedResumo.totais.senso)} />
                  <KpiCard label="Votos" value={String(selectedResumo.totais.votos)} />
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-200">
                  {loadingDetail ? (
                    <p className="text-slate-300">Carregando detalhes em cache...</p>
                  ) : (
                    <>
                      <p className="font-semibold text-white">Resumo de respostas associadas</p>
                      <ul className="mt-2 space-y-1 text-slate-300">
                        <li>Respostas Big Five: {selectedDetail?.respostasBigFive?.length ?? 0}</li>
                        <li>Respostas Opiniao: {selectedDetail?.respostasPesquisas?.length ?? 0}</li>
                        <li>Respostas Senso: {selectedDetail?.respostasSenso?.length ?? 0}</li>
                        <li>Votos Intencao: {selectedDetail?.votos?.length ?? 0}</li>
                      </ul>
                    </>
                  )}
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/45 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <MapPin className="size-4 text-rose-300" />
                    Localizacao mais recente do participante
                  </div>
                  <ParticipanteLocationMap
                    point={
                      latestLocation
                        ? {
                            lat: latestLocation.lat,
                            lng: latestLocation.lng,
                            label: `${latestLocation.label} | ${formatDate(latestLocation.data)}`,
                          }
                        : null
                    }
                  />
                  {latestLocation ? (
                    <p className="mt-2 text-xs text-slate-400">
                      Fonte: {latestLocation.fonte} | Data: {formatDate(latestLocation.data)}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-4">
                  <ResponsesBlock title="Respostas de Opiniao" emptyMessage="Nenhuma resposta de opiniao encontrada.">
                    {selectedDetail?.respostasPesquisas?.map((resposta) => (
                      <article key={resposta.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
                        <p className="text-sm font-semibold text-white">{resposta.pesquisa?.titulo || "Pesquisa"}</p>
                        <p className="text-xs text-slate-400">Respondido em {formatDate(resposta.respondidoEm)}</p>
                        <ul className="mt-2 space-y-1 text-sm text-slate-300">
                          {resposta.respostas?.map((r) => (
                            <li key={r.id}>
                              {r.pergunta?.texto || "Pergunta"}: {r.opcaoResposta?.texto || "Opcao"}
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </ResponsesBlock>

                  <ResponsesBlock title="Respostas de Senso" emptyMessage="Nenhuma resposta de senso encontrada.">
                    {selectedDetail?.respostasSenso?.map((resposta) => (
                      <article key={resposta.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
                        <p className="text-sm font-semibold text-white">
                          {resposta.questionario?.titulo || "Questionario"}
                          {resposta.campanha?.nome ? ` | ${resposta.campanha.nome}` : ""}
                        </p>
                        <p className="text-xs text-slate-400">Respondido em {formatDate(resposta.respondidoEm)}</p>
                        <ul className="mt-2 space-y-1 text-sm text-slate-300">
                          {resposta.respostas?.map((r) => (
                            <li key={r.id}>
                              {r.pergunta?.texto || "Pergunta"}: {r.opcao?.texto || "Opcao"}
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </ResponsesBlock>

                  <ResponsesBlock title="Respostas de Big Five" emptyMessage="Nenhuma resposta de Big Five encontrada.">
                    {selectedDetail?.respostasBigFive?.map((resposta) => (
                      <article key={resposta.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
                        <p className="text-sm font-semibold text-white">{resposta.classificacao || "Sem classificacao"}</p>
                        <p className="text-xs text-slate-400">Respondido em {formatDate(resposta.respondidoEm)}</p>
                        <p className="mt-2 text-sm text-slate-300">{resposta.interpretacao || "Sem interpretacao"}</p>
                        <div className="mt-2 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                          <span>Abertura: {avg(resposta.abertura1, resposta.abertura2, resposta.abertura3)}</span>
                          <span>Consciencia: {avg(resposta.consc1, resposta.consc2, resposta.consc3)}</span>
                          <span>Extroversao: {avg(resposta.extro1, resposta.extro2, resposta.extro3)}</span>
                          <span>Amabilidade: {avg(resposta.amavel1, resposta.amavel2, resposta.amavel3)}</span>
                          <span>Neuroticismo: {avg(resposta.neuro1, resposta.neuro2, resposta.neuro3)}</span>
                        </div>
                      </article>
                    ))}
                  </ResponsesBlock>

                  <ResponsesBlock title="Respostas de Intencao de Voto" emptyMessage="Nenhum voto encontrado.">
                    {selectedDetail?.votos?.map((voto) => (
                      <article key={voto.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
                        <p className="text-sm font-semibold text-white">
                          {voto.candidato?.nome || "Candidato"}
                          {voto.candidato?.partido ? ` (${voto.candidato.partido})` : ""}
                        </p>
                        <p className="text-xs text-slate-400">Pesquisa: {voto.pesquisa?.titulo || "-"}</p>
                        <p className="text-xs text-slate-400">Registrado em {formatDate(voto.criadoEm)}</p>
                      </article>
                    ))}
                  </ResponsesBlock>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ResponsesBlock({
  title,
  emptyMessage,
  children,
}: {
  title: string;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];

  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
      <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-200">{title}</h4>
      {items.length ? (
        <div className="mt-3 max-h-72 space-y-3 overflow-auto pr-1">{items}</div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">{emptyMessage}</p>
      )}
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

export default ParticipantesDashboard;
