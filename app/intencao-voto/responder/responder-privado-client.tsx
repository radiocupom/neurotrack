"use client";

import { useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";

import { PainelSelecaoVoto, ResumoPesquisaVoto } from "@/app/components/intencao-voto-compostos";
import {
  FormularioLocalizacao,
  FormularioParticipantePrivado,
  MensagemFila,
  MensagemSucesso,
  ParticipanteInfo,
} from "@/app/components/pesquisa-opiniao-compostos";
import { Alert, Button, Card, Loading, Select, Stepper } from "@/app/components/ui-primitives";
import { useIntencaoVotoPrivado } from "@/lib/hooks/use-intencao-voto-privado";
import { usePesquisasIntencaoVoto } from "@/lib/hooks/use-pesquisas-intencao-voto";

type Step = "selecao" | "participante" | "localizacao" | "voto" | "resultado";

type Localizacao = {
  estado: string;
  cidade: string;
  bairro: string;
};

export function ResponderIntencaoVotoPrivadoClient() {
  const searchParams = useSearchParams();
  const pesquisaInicial = searchParams.get("pesquisaId") ?? "";

  const [passo, setPasso] = useState<Step>(pesquisaInicial ? "participante" : "selecao");
  const [pesquisaSelecionadaId, setPesquisaSelecionadaId] = useState(pesquisaInicial);
  const [localizacao, setLocalizacao] = useState<Localizacao | null>(null);
  const [candidatoId, setCandidatoId] = useState("");
  const [idade, setIdade] = useState("");
  const [canal, setCanal] = useState("PRESENCIAL");

  const { pesquisas, loading: pesquisasLoading } = usePesquisasIntencaoVoto({ autoload: true });
  const {
    pesquisa,
    pesquisaLoading,
    pesquisaError,
    participante,
    participanteLoading,
    participanteError,
    contexto,
    buscarOuCriarParticipante,
    votar,
    limpar,
  } = useIntencaoVotoPrivado({ pesquisaId: pesquisaSelecionadaId });

  function handleSelecionarPesquisa(event: ChangeEvent<HTMLSelectElement>) {
    const id = event.target.value;
    setPesquisaSelecionadaId(id);
    setLocalizacao(null);
    setCandidatoId("");
    setIdade("");
    setCanal("PRESENCIAL");
    limpar();
    if (id) {
      setPasso("participante");
    }
  }

  async function handleEnviarVoto() {
    if (!localizacao) {
      return;
    }

    const finalState = await votar(localizacao, {
      candidatoId,
      idade: Number(idade),
      canal,
    });

    if (finalState === "success" || finalState === "queued" || finalState === "already-voted") {
      setPasso("resultado");
    }
  }

  function resetFlow() {
    setPasso("selecao");
    setPesquisaSelecionadaId("");
    setLocalizacao(null);
    setCandidatoId("");
    setIdade("");
    setCanal("PRESENCIAL");
    limpar();
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col p-3 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(8,15,31,0.88),rgba(15,23,42,0.78))] p-4 shadow-2xl shadow-slate-950/40 sm:p-6">
        <header className="mb-6 border-b border-white/10 pb-5">
          <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200">
            Intencao de Voto
          </div>
          <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">Aplicar pesquisa</h1>
          <p className="mt-2 text-sm text-slate-300">Fluxo privado para entrevistadores com validacao de participante e registro unico por pesquisa.</p>
        </header>

        {passo !== "resultado" ? (
          <Stepper
            steps={[
              { id: "selecao", label: "Pesquisa" },
              { id: "participante", label: "Participante" },
              { id: "localizacao", label: "Localizacao" },
              { id: "voto", label: "Voto" },
            ]}
            currentStep={passo}
          />
        ) : null}

        {passo === "selecao" ? (
          <Card>
            {pesquisasLoading ? <Loading message="Carregando pesquisas..." /> : null}
            {!pesquisasLoading && pesquisas.length === 0 ? <Alert type="warning">Nenhuma pesquisa disponivel.</Alert> : null}
            {!pesquisasLoading && pesquisas.length > 0 ? (
              <Select
                label="Pesquisa"
                value={pesquisaSelecionadaId}
                onChange={handleSelecionarPesquisa}
                options={pesquisas.map((item) => ({ value: item.id, label: `${item.titulo} - ${item.cargo}` }))}
              />
            ) : null}
          </Card>
        ) : null}

        {passo === "participante" ? (
          <>
            {pesquisaError ? <Alert type="error" className="mb-4">{pesquisaError}</Alert> : null}
            {pesquisaLoading ? <Loading message="Carregando pesquisa..." /> : null}
            {pesquisa ? (
              <div className="space-y-4">
                <ResumoPesquisaVoto pesquisa={pesquisa} />
                {!participante ? (
                  <FormularioParticipantePrivado
                    onBuscar={buscarOuCriarParticipante}
                    loading={participanteLoading}
                    error={participanteError}
                  />
                ) : (
                  <div>
                    <ParticipanteInfo participante={participante} onMudar={limpar} />
                    <Button onClick={() => setPasso("localizacao")} fullWidth>
                      Continuar
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </>
        ) : null}

        {passo === "localizacao" && pesquisa ? (
          <>
            <ParticipanteInfo participante={participante} onMudar={limpar} />
            <Card>
              <h2 className="mb-4 text-xl font-bold text-slate-100">Localizacao</h2>
              <FormularioLocalizacao
                onSubmit={(value) => {
                  setLocalizacao(value);
                  setPasso("voto");
                }}
              />
            </Card>
            <Button onClick={() => setPasso("participante")} variant="secondary" fullWidth className="mt-4">
              Voltar
            </Button>
          </>
        ) : null}

        {passo === "voto" && pesquisa ? (
          <div className="space-y-4">
            <ParticipanteInfo participante={participante} onMudar={limpar} />
            <ResumoPesquisaVoto pesquisa={pesquisa} />
            <PainelSelecaoVoto
              pesquisa={pesquisa}
              candidatoId={candidatoId}
              onSelecionarCandidato={setCandidatoId}
              idade={idade}
              onIdadeChange={setIdade}
              canal={canal}
              onCanalChange={setCanal}
              error={contexto.error}
            />
            <div className="flex gap-3">
              <Button onClick={() => setPasso("localizacao")} variant="secondary" fullWidth>
                Voltar
              </Button>
              <Button
                onClick={() => void handleEnviarVoto()}
                loading={contexto.isProcessing}
                fullWidth
                disabled={!candidatoId || !idade}
              >
                Registrar voto
              </Button>
            </div>
          </div>
        ) : null}

        {passo === "resultado" ? (
          <>
            {contexto.state === "queued" ? <MensagemFila /> : null}
            {contexto.state === "success" ? (
              <MensagemSucesso
                mensagem="Voto registrado"
                submensagem="O voto do participante foi salvo com sucesso."
                onNovaResposta={resetFlow}
              />
            ) : null}
            {contexto.state === "error" ? (
              <Card>
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                    <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-red-300">Voto não permitido</h2>
                  <p className="text-sm text-slate-300">{contexto.error}</p>
                  <Button onClick={resetFlow} fullWidth className="mt-2">
                    Nova pesquisa
                  </Button>
                </div>
              </Card>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
