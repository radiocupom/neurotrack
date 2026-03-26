"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { FormularioLocalizacao, MensagemFila, MensagemSucesso } from "@/app/components/pesquisa-opiniao-compostos";
import { Alert, Button, Loading, Stepper } from "@/app/components/ui-primitives";
import {
  carregarQuestionarioBigFiveAction,
  carregarQuestionarioSenso,
  enviarBigFivePublico,
  enviarSensoPublico,
  precheckJornada,
  type QuestionarioSensoBase,
} from "@/app/sensobigfive/jornada-actions";

type Step = "identificacao" | "localizacao" | "senso" | "bigfive" | "resultado";

type BigFivePergunta = {
  id: string;
  texto: string;
  campo: string;
  ordem: number;
};

type BigFiveQuestionario = {
  id: string;
  titulo: string;
  descricao?: string;
  escalaMin: number;
  escalaMax: number;
  escalaLabels: Record<string, string>;
  perguntas: BigFivePergunta[];
};

type Localizacao = {
  estado: string;
  cidade: string;
  bairro: string;
};

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readParticipanteId(value: unknown) {
  const root = readObject(value);
  if (!root) {
    return "";
  }

  const participante = readObject(root.participante);
  const data = readObject(root.data);
  const status = readObject(root.status);

  return readString(root.participanteId)
    || readString(participante?.id)
    || readString(data?.participanteId)
    || readString(status?.participanteId);
}

function readEtapaAtual(value: unknown) {
  const root = readObject(value);
  const status = readObject(root?.status);
  return readString(status?.etapaAtual).toUpperCase();
}

function normalizeBigFiveQuestionario(value: unknown): BigFiveQuestionario | null {
  const root = readObject(value);
  const raw =
    readObject(root?.data) ??
    readObject(root?.resultado) ??
    readObject(root?.item) ??
    readObject(root?.payload) ??
    root;
  if (!raw) return null;

  const perguntasRaw = Array.isArray(raw.perguntas) ? raw.perguntas : [];
  const perguntas = perguntasRaw
    .map((item, index) => {
      const pergunta = readObject(item);
      if (!pergunta || typeof pergunta.campo !== "string") {
        return null;
      }

      return {
        id: typeof pergunta.id === "string" && pergunta.id.trim() ? pergunta.id : `${pergunta.campo}-${index + 1}`,
        texto: typeof pergunta.texto === "string" ? pergunta.texto : `Pergunta ${index + 1}`,
        campo: pergunta.campo,
        ordem: typeof pergunta.ordem === "number" ? pergunta.ordem : index + 1,
      };
    })
    .filter((item): item is BigFivePergunta => item != null)
    .sort((a, b) => a.ordem - b.ordem);

  if (!perguntas.length) {
    return null;
  }

  const escala = readObject(raw.escala);
  const labelsRaw = readObject(escala?.labels) ?? {};
  const escalaLabels = Object.entries(labelsRaw).reduce<Record<string, string>>((acc, [key, item]) => {
    if (typeof item === "string") {
      acc[key] = item;
    }
    return acc;
  }, {});

  return {
    id: typeof raw.id === "string" ? raw.id : "bigfive",
    titulo: typeof raw.titulo === "string" ? raw.titulo : "Big Five",
    descricao: typeof raw.descricao === "string" ? raw.descricao : undefined,
    escalaMin: typeof escala?.min === "number" ? escala.min : 1,
    escalaMax: typeof escala?.max === "number" ? escala.max : 5,
    escalaLabels,
    perguntas,
  };
}

function isTelefoneValido(telefone: string) {
  const normalized = telefone.replace(/\D/g, "");
  return normalized.length >= 10;
}

export function JornadaPublicaClient({ campanhaId }: { campanhaId: string }) {
  const [step, setStep] = useState<Step>("identificacao");
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [idade, setIdade] = useState("");
  const [localizacao, setLocalizacao] = useState<Localizacao | null>(null);
  const [sensoQuestionario, setSensoQuestionario] = useState<QuestionarioSensoBase | null>(null);
  const [bigFiveQuestionario, setBigFiveQuestionario] = useState<BigFiveQuestionario | null>(null);
  const [sensoRespostas, setSensoRespostas] = useState<Record<string, string>>({});
  const [bigFiveRespostas, setBigFiveRespostas] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [sensoPendente, setSensoPendente] = useState(false);
  const [participanteId, setParticipanteId] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [sensoResult, bigFiveResult] = await Promise.all([
          carregarQuestionarioSenso(),
          carregarQuestionarioBigFiveAction(),
        ]);

        if (!mounted) return;

        if (!sensoResult.ok || !sensoResult.data) {
          setError(sensoResult.message || "Nao foi possivel carregar o questionario do senso.");
          return;
        }

        if (!bigFiveResult.ok || !bigFiveResult.data) {
          setError(bigFiveResult.message || "Nao foi possivel carregar o questionario Big Five.");
          return;
        }

        const bigFiveNormalized = normalizeBigFiveQuestionario(bigFiveResult.data);
        if (!bigFiveNormalized) {
          setError("Questionario Big Five invalido para rota publica.");
          return;
        }

        setSensoQuestionario(sensoResult.data);
        setBigFiveQuestionario(bigFiveNormalized);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const escalaOptions = useMemo(() => {
    if (!bigFiveQuestionario) return [] as number[];
    const result: number[] = [];
    for (let value = bigFiveQuestionario.escalaMin; value <= bigFiveQuestionario.escalaMax; value += 1) {
      result.push(value);
    }
    return result;
  }, [bigFiveQuestionario]);

  const handlePrecheck = useCallback(async () => {
    if (!isTelefoneValido(telefone)) {
      setError("Informe um telefone valido para iniciar a jornada.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await precheckJornada({
        campanhaId,
        telefone: telefone.replace(/\D/g, ""),
      });

      if (!result.ok || !result.data) {
        setError(result.message || "Falha ao validar jornada do participante.");
        return;
      }

      const participanteIdLido = readParticipanteId(result.data);
      if (participanteIdLido) {
        setParticipanteId(participanteIdLido);
      }

      const status = readObject(result.data.status);
      const jornadaConcluida = Boolean(status?.jornadaConcluida || status?.etapaAtual === "JORNADA_CONCLUIDA");
      if (jornadaConcluida) {
        setStep("resultado");
        setQueued(false);
        return;
      }

      const sensoRespondido = Boolean(status?.sensoRespondido) || status?.podeResponderSenso === false;
      setSensoPendente(!sensoRespondido);
      setStep("localizacao");
    } finally {
      setSubmitting(false);
    }
  }, [campanhaId, telefone]);

  async function handleEnviarSenso() {
    if (!sensoQuestionario || !localizacao) {
      setError("Complete identificacao e localizacao antes de enviar o senso.");
      return;
    }

    const faltantes = sensoQuestionario.perguntas.some((pergunta) => !sensoRespostas[pergunta.id]);
    if (faltantes) {
      setError("Responda todas as perguntas do senso para continuar.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await enviarSensoPublico({
        telefone: telefone.replace(/\D/g, ""),
        nome: nome.trim() || undefined,
        email: email.trim() || undefined,
        campanhaId,
        questionarioId: sensoQuestionario.id,
        estado: localizacao.estado,
        cidade: localizacao.cidade,
        bairro: localizacao.bairro,
        canal: "WHATSAPP",
        idade: idade.trim() ? Number(idade) : undefined,
        respostas: sensoQuestionario.perguntas.map((pergunta) => ({
          perguntaId: pergunta.id,
          opcaoId: sensoRespostas[pergunta.id],
        })),
      });

      if (!result.ok) {
        setError(result.message || "Falha ao enviar senso publico.");
        return;
      }

      if (result.status === 202) {
        setQueued(true);
        setStep("resultado");
        return;
      }

      const precheckResult = await precheckJornada({
        campanhaId,
        telefone: telefone.replace(/\D/g, ""),
        participanteId,
      });

      if (!precheckResult.ok || !precheckResult.data) {
        setError(precheckResult.message || "Falha ao validar etapa do Big Five.");
        return;
      }

      const participanteIdLido = readParticipanteId(precheckResult.data);
      if (participanteIdLido) {
        setParticipanteId(participanteIdLido);
      }

      const etapaAtual = readEtapaAtual(precheckResult.data);
      if (etapaAtual === "BIGFIVE") {
        setStep("bigfive");
        return;
      }

      setError("A etapa Big Five ainda nao foi liberada para este participante.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnviarBigFive() {
    if (!bigFiveQuestionario || !localizacao || !participanteId) {
      setError("Complete identificacao e localizacao antes de enviar o Big Five.");
      return;
    }

    const faltantes = bigFiveQuestionario.perguntas.some((pergunta) => !bigFiveRespostas[pergunta.campo]);
    if (faltantes) {
      setError("Responda todas as perguntas do Big Five para concluir a jornada.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payloadBase = bigFiveQuestionario.perguntas.reduce<Record<string, number>>((acc, pergunta) => {
        acc[pergunta.campo] = bigFiveRespostas[pergunta.campo];
        return acc;
      }, {});

      const result = await enviarBigFivePublico({
        participanteId,
        telefone: telefone.replace(/\D/g, ""),
        nome: nome.trim() || undefined,
        email: email.trim() || undefined,
        campanhaId,
        canal: "WHATSAPP",
        idade: idade.trim() ? Number(idade) : undefined,
        estado: localizacao.estado,
        cidade: localizacao.cidade,
        bairro: localizacao.bairro,
        abertura1: payloadBase.abertura1,
        abertura2: payloadBase.abertura2,
        abertura3: payloadBase.abertura3,
        consc1: payloadBase.consc1,
        consc2: payloadBase.consc2,
        consc3: payloadBase.consc3,
        extro1: payloadBase.extro1,
        extro2: payloadBase.extro2,
        extro3: payloadBase.extro3,
        amavel1: payloadBase.amavel1,
        amavel2: payloadBase.amavel2,
        amavel3: payloadBase.amavel3,
        neuro1: payloadBase.neuro1,
        neuro2: payloadBase.neuro2,
        neuro3: payloadBase.neuro3,
      });

      if (!result.ok) {
        setError(result.message || "Falha ao enviar Big Five publico.");
        return;
      }

      setQueued(result.status === 202);
      setStep("resultado");
    } finally {
      setSubmitting(false);
    }
  }

  const steps = [
    { id: "identificacao", label: "Identificacao" },
    { id: "localizacao", label: "Localizacao" },
    { id: "senso", label: "Senso" },
    { id: "bigfive", label: "BigFive" },
  ];

  if (loading) {
    return <Loading message="Carregando jornada publica..." />;
  }

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_30%),linear-gradient(180deg,#020617,#0f172a)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur sm:p-6">
        {step !== "resultado" ? <Stepper steps={steps} currentStep={step} /> : null}

        {error ? <Alert type="error" className="mb-4">{error}</Alert> : null}

        {step === "identificacao" ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Iniciar jornada publica</h2>
            <p className="text-sm text-slate-300">Informe telefone para localizar ou autocadastrar participante.</p>
            <label className="block text-sm text-slate-200">
              <span className="mb-1 block">Telefone</span>
              <input
                value={telefone}
                onChange={(event) => setTelefone(event.target.value.replace(/\D/g, ""))}
                className="h-10 w-full rounded-lg border border-white/10 bg-slate-800 px-3 text-sm text-slate-100"
                placeholder="5511999999999"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-slate-200">
                <span className="mb-1 block">Nome (opcional)</span>
                <input
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  className="h-10 w-full rounded-lg border border-white/10 bg-slate-800 px-3 text-sm text-slate-100"
                  placeholder="Nome para autocadastro"
                />
              </label>
              <label className="block text-sm text-slate-200">
                <span className="mb-1 block">Email (opcional)</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-10 w-full rounded-lg border border-white/10 bg-slate-800 px-3 text-sm text-slate-100"
                  placeholder="email@exemplo.com"
                />
              </label>
            </div>
            <label className="block text-sm text-slate-200">
              <span className="mb-1 block">Idade (opcional)</span>
              <input
                type="number"
                min={0}
                max={150}
                value={idade}
                onChange={(event) => setIdade(event.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-slate-800 px-3 text-sm text-slate-100"
                placeholder="Ex: 34"
              />
            </label>
            <Button onClick={() => void handlePrecheck()} loading={submitting} disabled={!isTelefoneValido(telefone)} fullWidth>
              Validar participante
            </Button>
          </div>
        ) : null}

        {step === "localizacao" ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Localizacao</h2>
            <FormularioLocalizacao
              onSubmit={(value) => {
                setLocalizacao(value);
                setStep(sensoPendente ? "senso" : "bigfive");
              }}
              loading={submitting}
            />
            <Button onClick={() => setStep("identificacao")} variant="secondary" fullWidth>
              Voltar
            </Button>
          </div>
        ) : null}

        {step === "senso" && sensoQuestionario ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Senso populacional</h2>
            <p className="text-sm text-slate-300">{sensoQuestionario.titulo}</p>
            {sensoQuestionario.perguntas.map((pergunta) => (
              <div key={pergunta.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-100">{pergunta.texto}</p>
                <div className="space-y-2">
                  {pergunta.opcoes.map((opcao) => (
                    <label key={opcao.id} className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="radio"
                        name={`senso-${pergunta.id}`}
                        checked={sensoRespostas[pergunta.id] === opcao.id}
                        onChange={() => setSensoRespostas((prev) => ({ ...prev, [pergunta.id]: opcao.id }))}
                      />
                      <span>{opcao.texto}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => setStep("localizacao")} variant="secondary" fullWidth>
                Voltar
              </Button>
              <Button onClick={() => void handleEnviarSenso()} loading={submitting} fullWidth>
                Enviar senso
              </Button>
            </div>
          </div>
        ) : null}

        {step === "bigfive" && bigFiveQuestionario ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Big Five</h2>
            <p className="text-sm text-slate-300">{bigFiveQuestionario.titulo}</p>
            {bigFiveQuestionario.perguntas.map((pergunta) => (
              <div key={pergunta.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-100">{pergunta.texto}</p>
                <div className="flex flex-wrap gap-2">
                  {escalaOptions.map((option) => (
                    <label key={`${pergunta.id}-${option}`} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-200">
                      <input
                        type="radio"
                        name={`bigfive-${pergunta.id}`}
                        checked={bigFiveRespostas[pergunta.campo] === option}
                        onChange={() => setBigFiveRespostas((prev) => ({ ...prev, [pergunta.campo]: option }))}
                      />
                      <span>{option}</span>
                      <span className="text-slate-400">{bigFiveQuestionario.escalaLabels[String(option)] || ""}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => setStep(sensoPendente ? "senso" : "localizacao")} variant="secondary" fullWidth>
                Voltar
              </Button>
              <Button onClick={() => void handleEnviarBigFive()} loading={submitting} fullWidth>
                Finalizar jornada
              </Button>
            </div>
          </div>
        ) : null}

        {step === "resultado" ? (
          queued ? (
            <MensagemFila />
          ) : (
            <MensagemSucesso
              mensagem="Jornada concluida"
              submensagem="Obrigado por participar. Suas respostas foram registradas."
              onNovaResposta={() => {
                setStep("identificacao");
                setQueued(false);
                setError(null);
                setLocalizacao(null);
                setSensoRespostas({});
                setBigFiveRespostas({});
              }}
            />
          )
        ) : null}
      </div>
    </section>
  );
}
