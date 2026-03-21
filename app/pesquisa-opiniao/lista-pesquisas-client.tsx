"use client";

import Link from "next/link";

import { Alert, Button, Card, Loading } from "@/app/components/ui-primitives";
import { usePesquisasOpiniao } from "@/lib/hooks/use-pesquisas-opiniao";

export function ListaPesquisasClient() {
  const { pesquisas, loading, error, refetch } = usePesquisasOpiniao({ autoload: true });

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
            {pesquisas.map((pesquisa) => (
              <Card key={pesquisa.id} className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="mb-1 text-lg font-semibold text-slate-100">{pesquisa.titulo}</h2>
                  {pesquisa.descricao && <p className="mb-2 text-sm text-slate-300">{pesquisa.descricao}</p>}
                  <div className="flex gap-4 text-xs text-slate-400">
                    <span>{pesquisa.perguntas.length} pergunta(s)</span>
                    {pesquisa.ativa !== false && <span className="font-medium text-emerald-300">Ativa</span>}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <Link href={`/pesquisa-opiniao/responder?pesquisaId=${pesquisa.id}`}>
                    <Button variant="primary">Responder</Button>
                  </Link>
                </div>
              </Card>
            ))}
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
