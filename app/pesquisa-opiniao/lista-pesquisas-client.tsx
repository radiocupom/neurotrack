"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, Button, Card, Loading } from "@/app/components/ui-primitives";
import { usePesquisasOpiniao } from "@/lib/hooks/use-pesquisas-opiniao";

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

export function ListaPesquisasClient() {
  const { pesquisas, loading, error, refetch } = usePesquisasOpiniao({ autoload: true });
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  return (
    <section className="flex flex-1 min-w-0 flex-col p-3 sm:p-6 lg:p-8">
      <div className="min-w-0 rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(8,15,31,0.88),rgba(15,23,42,0.78))] p-4 sm:p-6 shadow-2xl shadow-slate-950/40">
        <header className="mb-6 border-b border-white/10 pb-5">
          <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200">
            Pesquisa de Opiniao
          </div>
          <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">Listar Pesquisas</h1>
          <p className="mt-2 text-sm text-slate-300">Selecione uma pesquisa para responder como entrevistador.</p>
        </header>

        {error && (
          <Alert type="error" className="mb-6">
            {error}
          </Alert>
        )}

        {loading && <Loading message="Carregando pesquisas..." />}

        {!loading && pesquisas.length === 0 && (
          <Alert type="info">Nenhuma pesquisa disponivel no momento.</Alert>
        )}

        {!loading && pesquisas.length > 0 && (
          <div className="grid gap-4">
            {pesquisas.map((pesquisa) => {
              const urlPublica = baseUrl
                ? `${baseUrl}/pesquisa-opiniao/${pesquisa.id}/responder-publico`
                : `/pesquisa-opiniao/${pesquisa.id}/responder-publico`;
              return (
                <Card key={pesquisa.id} className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-100">{pesquisa.titulo}</h2>
                      {pesquisa.ativa !== false ? (
                        <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                          Ativa
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200">
                          Inativa
                        </span>
                      )}
                    </div>
                    {pesquisa.descricao ? <p className="mt-2 text-sm text-slate-300">{pesquisa.descricao}</p> : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>{pesquisa.perguntas.length} pergunta(s)</span>
                      <span className="font-mono">{urlPublica}</span>
                      {baseUrl ? <CopiarLink url={urlPublica} /> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/pesquisa-opiniao/responder?pesquisaId=${pesquisa.id}`}>
                      <Button variant="primary">Responder</Button>
                    </Link>
                    <Link href={`/pesquisa-opiniao/${pesquisa.id}/responder-publico`}>
                      <Button variant="secondary">Tela publica</Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-6 text-center">
          <Button onClick={() => void refetch()} variant="secondary">
            Recarregar
          </Button>
        </div>
      </div>
    </section>
  );
}
