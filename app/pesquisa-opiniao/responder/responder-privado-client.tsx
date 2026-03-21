"use client";

import { useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";

import { Alert, Button, Card, Loading, Select, Stepper } from "@/app/components/ui-primitives";
import {
  FormularioLocalizacao,
  FormularioParticipantePrivado,
  ListaPerguntas,
  MensagemFila,
  MensagemSucesso,
  ParticipanteInfo,
  ResumoPesquisa,
} from "@/app/components/pesquisa-opiniao-compostos";
import { usePesquisaOpiniaoPrivado } from "@/lib/hooks/use-pesquisa-opiniao-privado";
import { usePesquisasOpiniao } from "@/lib/hooks/use-pesquisas-opiniao";
import type { RespostaUsuario } from "@/types/pesquisa-opiniao";

type Step = "selecao" | "participante" | "localizacao" | "respostas" | "resultado";

type Localizacao = {
  estado: string;
  cidade: string;
  bairro: string;
};

export function ResponderPesquisaPrivadoClient() {
  const searchParams = useSearchParams();
  const pesquisaInicial = searchParams.get("pesquisaId") ?? "";

  const [passo, setPasso] = useState<Step>(pesquisaInicial ? "participante" : "selecao");
  const [pesquisaSelecionadaId, setPesquisaSelecionadaId] = useState(pesquisaInicial);
  const [localizacao, setLocalizacao] = useState<Localizacao | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [errosValidacao, setErrosValidacao] = useState<Record<string, string>>({});

  const { pesquisas, loading: pesquisasLoading } = usePesquisasOpiniao({ autoload: true });

  const {
    pesquisa,
    pesquisaLoading,
    pesquisaError,
    participante,
    participanteLoading,
    participanteError,
    contexto,
    buscarOuCriarParticipante,
    responder,
    limpar,
  } = usePesquisaOpiniaoPrivado({
    pesquisaId: pesquisaSelecionadaId,
  });

  function handleSelecionarPesquisa(event: ChangeEvent<HTMLSelectElement>) {
    const id = event.target.value;
    setPesquisaSelecionadaId(id);
    setRespostas({});
    setErrosValidacao({});
    setLocalizacao(null);
    limpar();

    if (id) {
      setPasso("participante");
    }
  }

  function handleResponderSelecionada(perguntaId: string, opcaoId: string) {
    setRespostas((prev) => ({ ...prev, [perguntaId]: opcaoId }));

    if (errosValidacao[perguntaId]) {
      setErrosValidacao((prev) => {
        const next = { ...prev };
        delete next[perguntaId];
        return next;
      });
    }
  }

  async function handleEnviarRespostas() {
    if (!pesquisa || !localizacao) return;

    const erros: Record<string, string> = {};
    pesquisa.perguntas.forEach((pergunta) => {
      const obrigatoria = pergunta.obrigatoria ?? true;
      if (obrigatoria && !respostas[pergunta.id]) {
        erros[pergunta.id] = "Esta pergunta e obrigatoria.";
      }
    });

    if (Object.keys(erros).length > 0) {
      setErrosValidacao(erros);
      return;
    }

    const respostasArray: RespostaUsuario[] = Object.entries(respostas).map(
      ([perguntaId, opcaoRespostaId]) => ({ perguntaId, opcaoRespostaId }),
    );

    const finalState = await responder(localizacao, respostasArray);
    if (finalState === "success" || finalState === "queued") {
      setPasso("resultado");
    }
  }

  function handleNovaResposta() {
    setPasso("selecao");
    setPesquisaSelecionadaId("");
    setRespostas({});
    setErrosValidacao({});
    setLocalizacao(null);
    limpar();
  }

  const steps = [
    { id: "selecao", label: "Pesquisa" },
    { id: "participante", label: "Participante" },
    { id: "localizacao", label: "Localizacao" },
    { id: "respostas", label: "Respostas" },
  ];

  const perguntas = Array.isArray(pesquisa?.perguntas) ? pesquisa.perguntas : [];

  return (
    <section className="flex flex-1 min-w-0 flex-col p-3 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(8,15,31,0.88),rgba(15,23,42,0.78))] p-4 sm:p-6 shadow-2xl shadow-slate-950/40">
        <header className="mb-6 border-b border-white/10 pb-5">
          <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200">
            Pesquisa de Opiniao
          </div>
          <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">Responder Pesquisa</h1>
          <p className="mt-2 text-sm text-slate-300">Fluxo privado para entrevistadores com identificacao de participante.</p>
        </header>
        {passo !== "resultado" && <Stepper steps={steps} currentStep={passo} />}

        {passo === "selecao" && (
          <Card>
            <h2 className="mb-4 text-xl font-bold text-slate-100">Pesquisas Disponiveis</h2>

            {pesquisasLoading && <Loading />}

            {!pesquisasLoading && pesquisas.length === 0 && (
              <Alert type="warning">Nenhuma pesquisa disponivel no momento.</Alert>
            )}

            {!pesquisasLoading && pesquisas.length > 0 && (
              <Select
                label="Selecione uma pesquisa"
                options={pesquisas.map((item) => ({
                  value: item.id,
                  label: `${item.titulo}${item.descricao ? ` - ${item.descricao}` : ""}`,
                }))}
                value={pesquisaSelecionadaId}
                onChange={handleSelecionarPesquisa}
                required
              />
            )}
          </Card>
        )}

        {passo === "participante" && (
          <>
            {pesquisaError && (
              <Alert type="error" className="mb-4">
                {pesquisaError}
              </Alert>
            )}

            {pesquisaLoading && <Loading message="Carregando pesquisa..." />}

            {!pesquisaLoading && pesquisa && (
              <>
                <ResumoPesquisa
                  titulo={pesquisa.titulo}
                  descricao={pesquisa.descricao}
                  totalPerguntas={perguntas.length}
                  totalRespostas={Object.keys(respostas).length}
                />

                {!participante ? (
                  <FormularioParticipantePrivado
                    onBuscar={buscarOuCriarParticipante}
                    loading={participanteLoading}
                    error={participanteError}
                  />
                ) : (
                  <div>
                    <ParticipanteInfo participante={participante} loading={participanteLoading} onMudar={limpar} />

                    <Button onClick={() => setPasso("localizacao")} fullWidth>
                      Continuar
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {passo === "localizacao" && pesquisa && (
          <>
            <ParticipanteInfo participante={participante} />

            <Card>
              <h2 className="mb-4 text-xl font-bold text-slate-100">Localizacao</h2>
              <FormularioLocalizacao
                onSubmit={(value) => {
                  setLocalizacao(value);
                  setErrosValidacao({});
                  setPasso("respostas");
                }}
                loading={false}
              />
            </Card>

            <Button onClick={() => setPasso("participante")} variant="secondary" fullWidth className="mt-4">
              Voltar
            </Button>
          </>
        )}

        {passo === "respostas" && pesquisa && (
          <>
            <ParticipanteInfo participante={participante} />

            <ResumoPesquisa
              titulo={pesquisa.titulo}
              descricao={pesquisa.descricao}
              totalPerguntas={perguntas.length}
              totalRespostas={Object.keys(respostas).filter((key) => respostas[key]).length}
            />

            <ListaPerguntas
              perguntas={perguntas}
              respostas={respostas}
              onResponder={handleResponderSelecionada}
              erros={errosValidacao}
            />

            {contexto.error && (
              <Alert type="error" className="mb-4">
                {contexto.error}
              </Alert>
            )}

            <div className="mt-6 flex gap-3">
              <Button onClick={() => setPasso("localizacao")} variant="secondary" fullWidth>
                Voltar
              </Button>

              <Button
                onClick={() => void handleEnviarRespostas()}
                loading={contexto.isProcessing}
                disabled={Object.keys(respostas).length === 0 || !localizacao}
                fullWidth
              >
                {contexto.state === "submitting" && "Enviando..."}
                {contexto.state === "queued" && "Processando..."}
                {["idle", "validating", "success", "error"].includes(contexto.state) && "Enviar"}
              </Button>
            </div>
          </>
        )}

        {passo === "resultado" && (
          <>
            {contexto.state === "queued" && <MensagemFila />}
            {contexto.state === "success" && (
              <MensagemSucesso
                submensagem="Suas respostas foram registradas com sucesso."
                onNovaResposta={handleNovaResposta}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
