import { externalApiRequest, externalApiRequestWithMeta, readExternalApiErrorMessage } from "@/service/api";

export type CanalBigFive = "WHATSAPP" | "TELEFONE" | "PRESENCIAL" | "OUTRO";

export type BigFiveCamposExtrasPayload = {
  canal?: CanalBigFive;
  idade?: number;
  telefone?: string;
  estado?: string;
  cidade?: string;
  bairro?: string;
};

export type QuestionarioBigFive = {
  id: string;
  titulo: string;
  descricao: string;
  escala: {
    min: number;
    max: number;
    labels: Record<string, string>; // { "1": "Discordo totalmente", "2": "Discordo", ... }
  };
  perguntas: Array<{
    id: string;
    texto: string;
    campo: string; // abertura1, abertura2, consc1, etc.
    fator: "Abertura" | "Conscienciosidade" | "Extroversão" | "Amabilidade" | "Neuroticismo";
    ordem: number;
  }>;
};

export type AvaliarBigFivePayload = {
  participanteId: string;
  campanhaId: string;
  abertura1: number;
  abertura2: number;
  abertura3: number;
  consc1: number;
  consc2: number;
  consc3: number;
  extro1: number;
  extro2: number;
  extro3: number;
  amavel1: number;
  amavel2: number;
  amavel3: number;
  neuro1: number;
  neuro2: number;
  neuro3: number;
} & BigFiveCamposExtrasPayload;

export type AvaliarBigFivePublicoPayload = Omit<AvaliarBigFivePayload, "participanteId"> & {
  telefone: string;
};

export function avaliarBigFiveFromExternalApi(token: string, payload: AvaliarBigFivePayload) {
  return externalApiRequestWithMeta<unknown>("/bigfive/avaliar", {
    method: "POST",
    body: payload,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function obterResultadoBigFiveFromExternalApi(token: string, participanteId: string) {
  return externalApiRequest<unknown>(`/bigfive/resultado/${encodeURIComponent(participanteId)}`, {
    method: "GET",
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function avaliarBigFivePublicoFromExternalApi(payload: AvaliarBigFivePublicoPayload) {
  return externalApiRequest<Record<string, unknown>>("/bigfive/avaliar-publico", {
    method: "POST",
    body: payload,
  });
}

export async function carregarQuestionarioBigFive() {
  try {
    const data = await externalApiRequest<QuestionarioBigFive>("/bigfive/questionario", {
      method: "GET",
    });

    // Validar estrutura básica
    if (!data || !Array.isArray(data.perguntas)) {
      throw new Error("Estrutura de questionário inválida.");
    }

    // Garantir que as perguntas estão ordenadas por ordem
    data.perguntas.sort((a, b) => a.ordem - b.ordem);

    return {
      ok: true,
      status: 200,
      data,
      message: "ok",
    };
  } catch (error) {
    const message = readExternalApiErrorMessage(error);
    console.error("Erro ao carregar questionário Big Five:", error);

    let status = 0;
    if (error && typeof error === "object" && "status" in error) {
      status = (error as { status: unknown }).status as number;
    }

    return {
      ok: false,
      status,
      data: null,
      message: message || "Não foi possível carregar o questionário Big Five.",
    };
  }
}
