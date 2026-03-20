/**
 * Página: Responder Pesquisa Pública
 * 
 * Fluxo público sem autenticação
 * URL: /pesquisa-opiniao/[pesquisaId]/responder-publico
 * 
 * Fluxo:
 * 1. Carregar pesquisa pública
 * 2. Identificar participante por telefone
 * 3. Preencher localização
 * 4. Marcar respostas
 * 5. Enviar
 */

"use client";

import { useState } from "react";
import {
  Button,
  Alert,
  Stepper,
  Loading,
} from "@/app/components/ui-primitives";
import {
  FormularioLocalizacao,
  ListaPerguntas,
  ParticipanteInfo,
  FormularioParticipantePublico,
  ResumoPesquisa,
  MensagemSucesso,
  MensagemFila,
} from "@/app/components/pesquisa-opiniao-compostos";
import { usePesquisaOpiniaoPublico } from "@/lib/hooks/use-pesquisa-opiniao-publico";
import type { RespostaUsuario } from "@/types/pesquisa-opiniao";

interface Props {
  params: {
    pesquisaId: string;
  };
}

type Step = "identificacao" | "localizacao" | "respostas" | "resultado";

export function ResponderPesquisaPublicoPage({ params }: Props) {
  const { pesquisaId } = params;

  const [passo, setPasso] = useState<Step>("identificacao");
  const [localizacao, setLocalizacao] = useState<{ estado: string; cidade: string; bairro: string } | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [errosValidacao, setErrosValidacao] = useState<Record<string, string>>({});

  // Hook: Fluxo público
  const {
    pesquisa,
    pesquisaLoading,
    pesquisaError,
    participante,
    participanteLoading,
    participanteError,
    contexto,
    identificarParticipante,
    responder,
    limpar,
  } = usePesquisaOpiniaoPublico({
    pesquisaId,
  });

  // Handlers
  const handleParticipanteIdentificado = () => {
    setPasso("localizacao");
  };

  const handleLocalizacaoEnviada = (value: {
    estado: string;
    cidade: string;
    bairro: string;
  }) => {
    setLocalizacao(value);
    setErrosValidacao({});
    setPasso("respostas");
  };

  const handleResponderSelecionada = (perguntaId: string, opcaoId: string) => {
    setRespostas((prev) => ({
      ...prev,
      [perguntaId]: opcaoId,
    }));
    // Limpar erro ao responder
    if (errosValidacao[perguntaId]) {
      setErrosValidacao((prev) => {
        const novo = { ...prev };
        delete novo[perguntaId];
        return novo;
      });
    }
  };

  const handleEnviarRespostas = async () => {
    if (!pesquisa || !localizacao) return;

    // Validar respostas
    const erros: Record<string, string> = {};
    pesquisa.perguntas.forEach((pergunta) => {
      if (pergunta.obrigatoria && !respostas[pergunta.id]) {
        erros[pergunta.id] = "Esta pergunta é obrigatória";
      }
    });

    if (Object.keys(erros).length > 0) {
      setErrosValidacao(erros);
      return;
    }

    // Enviar respostas
    const respostasArray: RespostaUsuario[] = Object.entries(respostas).map(
      ([perguntaId, opcaoRespostaId]) => ({
        perguntaId,
        opcaoRespostaId,
      })
    );

    const finalState = await responder(localizacao, respostasArray);

    if (finalState === "success" || finalState === "queued") {
      setPasso("resultado");
    }
  };

  const handleNovaResposta = () => {
    setPasso("identificacao");
    setLocalizacao(null);
    setRespostas({});
    setErrosValidacao({});
    limpar();
  };

  // Controle de passos
  const steps = [
    { id: "identificacao", label: "Identificação" },
    { id: "localizacao", label: "Localização" },
    { id: "respostas", label: "Respostas" },
  ];

  // Renderizar
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Stepper */}
        {passo !== "resultado" && (
          <Stepper
            steps={steps}
            currentStep={passo}
          />
        )}

        {/* Carregamento da pesquisa */}
        {pesquisaLoading && (
          <Loading message="Carregando pesquisa..." fullScreen={false} />
        )}

        {pesquisaError && (
          <Alert type="error" className="mb-4">
            {pesquisaError}
          </Alert>
        )}

        {/* PASSO 1: Identificação */}
        {passo === "identificacao" && !pesquisaLoading && pesquisa && (
          <>
            <ResumoPesquisa
              titulo={pesquisa.titulo}
              descricao={pesquisa.descricao}
              totalPerguntas={pesquisa.perguntas.length}
              totalRespostas={0}
            />

            {!participante ? (
              <FormularioParticipantePublico
                onIdentificar={identificarParticipante}
                loading={participanteLoading}
                error={participanteError}
              />
            ) : (
              <div>
                <ParticipanteInfo participante={participante} />

                <Button
                  onClick={handleParticipanteIdentificado}
                  fullWidth
                >
                  Continuar
                </Button>
              </div>
            )}
          </>
        )}

        {/* PASSO 2: Localização */}
        {passo === "localizacao" && pesquisa && (
          <>
            <ParticipanteInfo participante={participante} />

            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Localização
              </h2>
              <FormularioLocalizacao
                onSubmit={handleLocalizacaoEnviada}
                loading={false}
              />
            </div>

            <Button
              onClick={() => setPasso("identificacao")}
              variant="secondary"
              fullWidth
            >
              Voltar
            </Button>
          </>
        )}

        {/* PASSO 3: Respostas */}
        {passo === "respostas" && pesquisa && (
          <>
            <ParticipanteInfo participante={participante} />

            <ResumoPesquisa
              titulo={pesquisa.titulo}
              descricao={pesquisa.descricao}
              totalPerguntas={pesquisa.perguntas.length}
              totalRespostas={Object.keys(respostas).filter(
                (key) => respostas[key]
              ).length}
            />

            <ListaPerguntas
              perguntas={pesquisa.perguntas}
              respostas={respostas}
              onResponder={handleResponderSelecionada}
              erros={errosValidacao}
            />

            {contexto.error && (
              <Alert type="error" className="mb-4">
                {contexto.error}
              </Alert>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setPasso("localizacao")}
                variant="secondary"
                fullWidth
              >
                Voltar
              </Button>

              <Button
                onClick={handleEnviarRespostas}
                loading={contexto.isProcessing}
                disabled={Object.keys(respostas).length === 0 || !localizacao}
                fullWidth
              >
                {contexto.state === "submitting" && "Enviando..."}
                {contexto.state === "queued" && "Processando..."}
                {["idle", "validating", "success", "error"].includes(contexto.state) && "Enviar Respostas"}
              </Button>
            </div>
          </>
        )}

        {/* PASSO 4: Resultado */}
        {passo === "resultado" && (
          <>
            {contexto.state === "queued" && <MensagemFila />}

            {contexto.state === "success" && (
              <MensagemSucesso
                submensagem="Muito obrigado por responder a nossa pesquisa!"
                onNovaResposta={handleNovaResposta}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ResponderPesquisaPublicoPage;
