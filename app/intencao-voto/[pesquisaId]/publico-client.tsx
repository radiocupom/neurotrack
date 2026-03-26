"use client";

import { useState } from "react";

import { FormularioIdentificacaoPublicaVoto, PainelSelecaoVoto, ResumoPesquisaVoto } from "@/app/components/intencao-voto-compostos";
import {
  FormularioLocalizacao,
  MensagemFila,
  MensagemSucesso,
  ParticipanteInfo,
} from "@/app/components/pesquisa-opiniao-compostos";
import { Alert, Button, Loading, Stepper } from "@/app/components/ui-primitives";
import { useIntencaoVotoPublico } from "@/lib/hooks/use-intencao-voto-publico";

type Step = "identificacao" | "localizacao" | "voto" | "resultado";

type Localizacao = {
  estado: string;
  cidade: string;
  bairro: string;
};

export function IntencaoVotoPublicoClient({ pesquisaId }: { pesquisaId: string }) {
  const [passo, setPasso] = useState<Step>("identificacao");
  const [localizacao, setLocalizacao] = useState<Localizacao | null>(null);
  const [candidatoId, setCandidatoId] = useState("");
  const [idade, setIdade] = useState("");
  const [canal, setCanal] = useState("WHATSAPP");

  const {
    pesquisa,
    pesquisaLoading,
    pesquisaError,
    participante,
    participanteLoading,
    participanteError,
    contexto,
    identificarParticipante,
    votar,
    limpar,
  } = useIntencaoVotoPublico({ pesquisaId });

  async function handleEnviarVoto() {
    if (!localizacao) {
      return;
    }

    const finalState = await votar(localizacao, {
      candidatoId,
      idade: Number(idade),
      canal,
    });

    if (finalState === "success" || finalState === "queued") {
      setPasso("resultado");
    }
  }

  function resetFlow() {
    setPasso("identificacao");
    setLocalizacao(null);
    setCandidatoId("");
    setIdade("");
    setCanal("WHATSAPP");
    limpar();
  }

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_30%),linear-gradient(180deg,#020617,#0f172a)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur sm:p-6">
        {passo !== "resultado" ? (
          <Stepper
            steps={[
              { id: "identificacao", label: "Participante" },
              { id: "localizacao", label: "Localizacao" },
              { id: "voto", label: "Voto" },
            ]}
            currentStep={passo}
          />
        ) : null}

        {pesquisaLoading ? <Loading message="Carregando pesquisa publica..." /> : null}
        {pesquisaError ? <Alert type="error">{pesquisaError}</Alert> : null}

        {pesquisa ? (
          <div className="space-y-4">
            <ResumoPesquisaVoto pesquisa={pesquisa} />

            {passo === "identificacao" ? (
              <div className="space-y-4">
                {!participante ? (
                  <FormularioIdentificacaoPublicaVoto
                    onIdentificar={identificarParticipante}
                    loading={participanteLoading}
                    error={participanteError}
                  />
                ) : (
                  <div className="space-y-4">
                    <ParticipanteInfo participante={participante} onMudar={limpar} />
                    <Alert type="info">Participante validado. Se o telefone nao existia, o backend realiza autocadastro e segue com o voto.</Alert>
                    <Button onClick={() => setPasso("localizacao")} fullWidth>
                      Continuar
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

            {passo === "localizacao" ? (
              <div className="space-y-4">
                <ParticipanteInfo participante={participante} onMudar={limpar} />
                <FormularioLocalizacao
                  onSubmit={(value) => {
                    setLocalizacao(value);
                    setPasso("voto");
                  }}
                />
                <Button onClick={() => setPasso("identificacao")} variant="secondary" fullWidth>
                  Voltar
                </Button>
              </div>
            ) : null}

            {passo === "voto" ? (
              <div className="space-y-4">
                <ParticipanteInfo participante={participante} onMudar={limpar} />
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
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button onClick={() => setPasso("localizacao")} variant="secondary" fullWidth>
                    Voltar
                  </Button>
                  <Button onClick={() => void handleEnviarVoto()} loading={contexto.isProcessing} disabled={!candidatoId || !idade} fullWidth>
                    Enviar voto
                  </Button>
                </div>
              </div>
            ) : null}

            {passo === "resultado" ? (
              <>
                {contexto.state === "queued" ? <MensagemFila /> : null}
                {contexto.state === "success" ? (
                  <MensagemSucesso
                    mensagem="Voto recebido"
                    submensagem="Seu voto foi registrado com sucesso."
                    onNovaResposta={resetFlow}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
