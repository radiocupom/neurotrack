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

type Step = "identificacao" | "localizacao" | "respostas" | "resultado";

export function ResponderPesquisaPublicoClient({ pesquisaId }: { pesquisaId: string }) {
  const [passo, setPasso] = useState<Step>("identificacao");
  const [localizacao, setLocalizacao] = useState<{ estado: string; cidade: string; bairro: string } | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [errosValidacao, setErrosValidacao] = useState<Record<string, string>>({});
  const [canal, setCanal] = useState<"WHATSAPP" | "TELEFONE" | "PRESENCIAL" | "OUTRO">("PRESENCIAL");
  const [idade, setIdade] = useState("");
  const [telefoneContato, setTelefoneContato] = useState("");

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
  } = usePesquisaOpiniaoPublico({ pesquisaId });

  const handleParticipanteIdentificado = () => {
    setPasso("localizacao");
  };

  const handleLocalizacaoEnviada = (value: { estado: string; cidade: string; bairro: string }) => {
    setLocalizacao(value);
    setErrosValidacao({});
    setPasso("respostas");
  };

  const handleResponderSelecionada = (perguntaId: string, opcaoId: string) => {
    setRespostas((prev) => ({ ...prev, [perguntaId]: opcaoId }));
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

    const respostasArray: RespostaUsuario[] = Object.entries(respostas).map(
      ([perguntaId, opcaoRespostaId]) => ({ perguntaId, opcaoRespostaId })
    );

    const finalState = await responder(localizacao, respostasArray, {
      canal,
      idade: idade.trim() ? Number(idade) : undefined,
      telefone: telefoneContato.trim() || undefined,
    });

    if (finalState === "success" || finalState === "queued") {
      setPasso("resultado");
    }
  };

  const handleNovaResposta = () => {
    setPasso("identificacao");
    setLocalizacao(null);
    setRespostas({});
    setErrosValidacao({});
    setCanal("PRESENCIAL");
    setIdade("");
    setTelefoneContato("");
    limpar();
  };

  const steps = [
    { id: "identificacao", label: "Identificação" },
    { id: "localizacao", label: "Localização" },
    { id: "respostas", label: "Respostas" },
  ];

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_30%),linear-gradient(180deg,#020617,#0f172a)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur sm:p-6">
          {passo !== "resultado" ? (
            <Stepper steps={steps} currentStep={passo} />
          ) : null}

          {pesquisaLoading ? <Loading message="Carregando pesquisa..." fullScreen={false} /> : null}

          {pesquisaError ? (
            <Alert type="error" className="mb-4">{pesquisaError}</Alert>
          ) : null}

          {/* PASSO 1: Identificação */}
          {passo === "identificacao" && !pesquisaLoading && pesquisa ? (
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
                  <Button onClick={handleParticipanteIdentificado} fullWidth>
                    Continuar
                  </Button>
                </div>
              )}
            </>
          ) : null}

          {/* PASSO 2: Localização */}
          {passo === "localizacao" && pesquisa ? (
            <>
              <ParticipanteInfo participante={participante} />
              <div className="mb-6">
                <h2 className="mb-4 text-xl font-bold text-slate-100">Localização</h2>
                <FormularioLocalizacao onSubmit={handleLocalizacaoEnviada} loading={false} />
              </div>
              <Button onClick={() => setPasso("identificacao")} variant="secondary" fullWidth>
                Voltar
              </Button>
            </>
          ) : null}

          {/* PASSO 3: Respostas */}
          {passo === "respostas" && pesquisa ? (
            <>
              <ParticipanteInfo participante={participante} />
              <ResumoPesquisa
                titulo={pesquisa.titulo}
                descricao={pesquisa.descricao}
                totalPerguntas={pesquisa.perguntas.length}
                totalRespostas={Object.keys(respostas).filter((key) => respostas[key]).length}
              />

              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-200">Dados complementares (opcional)</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-sm text-slate-300">
                    <span className="mb-1 block">Canal</span>
                    <select
                      value={canal}
                      onChange={(event) => setCanal(event.target.value as typeof canal)}
                      className="h-10 w-full rounded-lg border border-white/10 bg-slate-800 px-3 text-sm text-slate-100"
                    >
                      <option value="PRESENCIAL">PRESENCIAL</option>
                      <option value="WHATSAPP">WHATSAPP</option>
                      <option value="TELEFONE">TELEFONE</option>
                      <option value="OUTRO">OUTRO</option>
                    </select>
                  </label>

                  <label className="text-sm text-slate-300">
                    <span className="mb-1 block">Idade</span>
                    <input
                      type="number"
                      min={0}
                      max={150}
                      value={idade}
                      onChange={(event) => setIdade(event.target.value)}
                      placeholder="Ex: 28"
                      className="h-10 w-full rounded-lg border border-white/10 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500"
                    />
                  </label>

                  <label className="text-sm text-slate-300">
                    <span className="mb-1 block">Telefone</span>
                    <input
                      type="text"
                      value={telefoneContato}
                      onChange={(event) => setTelefoneContato(event.target.value)}
                      placeholder={participante?.contato ?? "5511999999999"}
                      className="h-10 w-full rounded-lg border border-white/10 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500"
                    />
                  </label>
                </div>
              </div>

              <ListaPerguntas
                perguntas={pesquisa.perguntas}
                respostas={respostas}
                onResponder={handleResponderSelecionada}
                erros={errosValidacao}
              />

              {contexto.error ? (
                <Alert type="error" className="mb-4">{contexto.error}</Alert>
              ) : null}

              <div className="mt-6 flex gap-3">
                <Button onClick={() => setPasso("localizacao")} variant="secondary" fullWidth>
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
          ) : null}

          {/* PASSO 4: Resultado */}
          {passo === "resultado" ? (
            <>
              {contexto.state === "queued" ? <MensagemFila /> : null}
              {contexto.state === "success" ? (
                <MensagemSucesso
                  submensagem="Muito obrigado por responder a nossa pesquisa!"
                  onNovaResposta={handleNovaResposta}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
