"use client";

import Link from "next/link";
import { useState } from "react";

import { Alert, Button, Card, Loading } from "@/app/components/ui-primitives";
import { usePesquisasIntencaoVoto } from "@/lib/hooks/use-pesquisas-intencao-voto";

function CopiarLink({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = () => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    <button
      type="button"
      onClick={copiar}
      className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-300 transition hover:bg-white/10"
    >
      {copiado ? "Copiado!" : "Copiar link"}
    </button>
  );
}

export function ListaPesquisasIntencaoVotoClient() {
  const { pesquisas, loading, error, refetch } = usePesquisasIntencaoVoto({ autoload: true });
  const pesquisasAtivas = pesquisas.filter((pesquisa) => pesquisa.ativo !== false);

  return (
    <section className="flex min-w-0 flex-1 flex-col p-3 sm:p-6 lg:p-8">
      <div className="rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(8,15,31,0.88),rgba(15,23,42,0.78))] p-4 shadow-2xl shadow-slate-950/40 sm:p-6">
        <header className="mb-6 border-b border-white/10 pb-5">
          <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200">
            Intencao de Voto
          </div>
          <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">Listar pesquisas</h1>
          <p className="mt-2 text-sm text-slate-300">Escolha uma pesquisa para responder no fluxo privado, editar na AreaShow ou abrir a tela publica.</p>
        </header>

        {error ? <Alert type="error" className="mb-4">{error}</Alert> : null}
        {loading ? <Loading message="Carregando pesquisas..." /> : null}
        {!loading && pesquisasAtivas.length === 0 ? <Alert type="info">Nenhuma pesquisa disponivel no momento.</Alert> : null}

        {!loading && pesquisasAtivas.length > 0 ? (
          <div className="grid gap-4">
            {pesquisasAtivas.map((pesquisa) => {
              const urlPublica = pesquisa.urlPublica?.trim() || pesquisa.urlPesquisa?.trim() || "";
              return (
                <Card key={pesquisa.id} className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-100">{pesquisa.titulo}</h2>
                      <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                        Ativa
                      </span>
                    </div>
                    {pesquisa.descricao ? <p className="mt-2 text-sm text-slate-300">{pesquisa.descricao}</p> : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>{pesquisa.cargo}</span>
                      <span>{pesquisa.candidatos.length} candidato(s)</span>
                      <span className="font-mono">{urlPublica || "URL publica indisponivel"}</span>
                      {urlPublica ? <CopiarLink url={urlPublica} /> : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {pesquisa.candidatos.slice(0, 4).map((candidato) => (
                        <span key={candidato.id} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                          {candidato.nome} • {candidato.partido || "-"}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/intencao-voto/responder?pesquisaId=${pesquisa.id}`}>
                      <Button>Responder</Button>
                    </Link>
                    {urlPublica ? (
                      <a href={urlPublica} target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary">Tela publica</Button>
                      </a>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : null}

        <div className="mt-6 text-center">
          <Button onClick={() => void refetch()} variant="secondary">
            Recarregar
          </Button>
        </div>
      </div>
    </section>
  );
}
