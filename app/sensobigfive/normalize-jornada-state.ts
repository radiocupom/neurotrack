import type { JornadaStep } from "@/app/sensobigfive/jornada-store";

export type ApiEtapaAtual = "SENSO_POPULACIONAL" | "BIGFIVE" | "JORNADA_CONCLUIDA";

export type JornadaStateFallback = {
  participanteId?: string;
  campanhaId?: string;
  campanhaNome?: string;
  questionarioId?: string;
  questionarioTitulo?: string;
  etapaAtual?: ApiEtapaAtual;
  mensagem?: string;
  origem?: string;
};

export type NormalizeJornadaStateInput = {
  precheck?: unknown;
  proximoPasso?: unknown;
  bigFiveResultado?: unknown;
  fallback?: JornadaStateFallback;
};

export type NormalizedJornadaState = {
  participanteId: string;
  campanhaId: string;
  campanhaNome: string;
  questionarioId: string;
  questionarioTitulo: string;
  etapaAtual: ApiEtapaAtual;
  uiStep: JornadaStep;
  sensoRespondido?: boolean;
  bigfiveRespondido?: boolean;
  podeResponderBigFive?: boolean;
  jornadaConcluida: boolean;
  origem: string;
  mensagem: string;
  fluxoBigFive: Record<string, unknown> | null;
  resultadoBigFive: Record<string, unknown> | null;
};

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function firstNonEmpty(...values: Array<unknown>) {
  for (const value of values) {
    const candidate = readString(value);
    if (candidate) {
      return candidate;
    }
  }

  return "";
}

function normalizeEtapa(value: unknown): ApiEtapaAtual | undefined {
  const etapa = readString(value).toUpperCase();

  if (etapa === "SENSO_POPULACIONAL" || etapa === "BIGFIVE" || etapa === "JORNADA_CONCLUIDA") {
    return etapa;
  }

  return undefined;
}

export function mapEtapaToUiStep(etapaAtual: ApiEtapaAtual): JornadaStep {
  if (etapaAtual === "BIGFIVE") {
    return "bigfive";
  }

  if (etapaAtual === "JORNADA_CONCLUIDA") {
    return "finalizado";
  }

  return "senso";
}

function readBigFivePayload(input: unknown) {
  const root = readObject(input);
  if (!root) {
    return { payload: null as Record<string, unknown> | null, fluxo: null as Record<string, unknown> | null };
  }

  const nestedData = readObject(root.data);
  const payload = nestedData ?? root;
  const fluxo = readObject(payload.fluxo);

  return { payload, fluxo };
}

export function normalizeJornadaState({
  precheck,
  proximoPasso,
  bigFiveResultado,
  fallback,
}: NormalizeJornadaStateInput): NormalizedJornadaState {
  const precheckPayload = readObject(precheck);
  const precheckCampanha = readObject(precheckPayload?.campanha);
  const precheckQuestionario = readObject(precheckPayload?.questionario);
  const precheckStatus = readObject(precheckPayload?.status);

  const nextStepPayload = readObject(proximoPasso);
  const bigFive = readBigFivePayload(bigFiveResultado);

  const etapaAtual =
    normalizeEtapa(bigFive.fluxo?.etapaAtual) ??
    normalizeEtapa(precheckStatus?.etapaAtual) ??
    normalizeEtapa(nextStepPayload?.tipo) ??
    normalizeEtapa(fallback?.etapaAtual) ??
    "SENSO_POPULACIONAL";

  const jornadaConcluida =
    etapaAtual === "JORNADA_CONCLUIDA" ||
    readBoolean(precheckStatus?.jornadaConcluida) ||
    readBoolean(nextStepPayload?.jornadaConcluida) ||
    false;

  return {
    participanteId: firstNonEmpty(
      precheckPayload?.participanteId,
      nextStepPayload?.participanteId,
      bigFive.payload?.participanteId,
      fallback?.participanteId,
    ),
    campanhaId: firstNonEmpty(
      precheckCampanha?.id,
      nextStepPayload?.campanhaId,
      bigFive.fluxo?.campanhaId,
      fallback?.campanhaId,
    ),
    campanhaNome: firstNonEmpty(precheckCampanha?.nome, nextStepPayload?.campanhaNome, fallback?.campanhaNome),
    questionarioId: firstNonEmpty(precheckQuestionario?.id, nextStepPayload?.questionarioId, fallback?.questionarioId),
    questionarioTitulo: firstNonEmpty(
      precheckQuestionario?.titulo,
      nextStepPayload?.questionarioTitulo,
      fallback?.questionarioTitulo,
    ),
    etapaAtual,
    uiStep: mapEtapaToUiStep(etapaAtual),
    sensoRespondido: readBoolean(precheckStatus?.sensoRespondido),
    bigfiveRespondido: readBoolean(precheckStatus?.bigfiveRespondido),
    podeResponderBigFive: readBoolean(precheckStatus?.podeResponderBigFive),
    jornadaConcluida,
    origem: firstNonEmpty(bigFive.fluxo?.origem, fallback?.origem),
    mensagem: firstNonEmpty(
      precheckPayload?.mensagem,
      nextStepPayload?.mensagem,
      bigFive.payload?.mensagem,
      bigFive.payload?.message,
      fallback?.mensagem,
    ),
    fluxoBigFive: bigFive.fluxo,
    resultadoBigFive: bigFive.payload,
  };
}