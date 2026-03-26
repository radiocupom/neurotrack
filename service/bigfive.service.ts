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
  participanteId: string;
  nome?: string;
  email?: string;
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
  return externalApiRequestWithMeta<Record<string, unknown>>("/bigfive/avaliar-publico", {
    method: "POST",
    body: payload,
  });
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readQuestionarioContainer(value: unknown): Record<string, unknown> | null {
  const root = readObject(value);
  if (!root) {
    return null;
  }

  const nestedCandidates = [root.data, root.resultado, root.item, root.payload];
  for (const candidate of nestedCandidates) {
    const normalized = readObject(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return root;
}

function normalizeQuestionarioBigFive(value: unknown): QuestionarioBigFive | null {
  const raw = readQuestionarioContainer(value);
  if (!raw) {
    return null;
  }

  const perguntasRaw = Array.isArray(raw.perguntas) ? raw.perguntas : [];
  const perguntas = perguntasRaw
    .map((item, index) => {
      const pergunta = readObject(item);
      if (!pergunta) {
        return null;
      }

      const campo = typeof pergunta.campo === "string" ? pergunta.campo.trim() : "";
      const texto = typeof pergunta.texto === "string" ? pergunta.texto.trim() : "";
      if (!campo || !texto) {
        return null;
      }

      return {
        id: typeof pergunta.id === "string" && pergunta.id.trim() ? pergunta.id : `${campo}-${index + 1}`,
        texto,
        campo,
        fator: typeof pergunta.fator === "string" ? (pergunta.fator as QuestionarioBigFive["perguntas"][number]["fator"]) : "Abertura",
        ordem: typeof pergunta.ordem === "number" ? pergunta.ordem : index + 1,
      };
    })
    .filter((item): item is QuestionarioBigFive["perguntas"][number] => item != null)
    .sort((a, b) => a.ordem - b.ordem);

  if (!perguntas.length) {
    return null;
  }

  const escalaRaw = readObject(raw.escala);
  const labelsRaw = readObject(escalaRaw?.labels) ?? {};
  const labels = Object.entries(labelsRaw).reduce<Record<string, string>>((acc, [key, item]) => {
    if (typeof item === "string") {
      acc[key] = item;
    }
    return acc;
  }, {});

  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : "bigfive",
    titulo: typeof raw.titulo === "string" && raw.titulo.trim() ? raw.titulo.trim() : "Big Five",
    descricao: typeof raw.descricao === "string" ? raw.descricao : "",
    escala: {
      min: typeof escalaRaw?.min === "number" ? escalaRaw.min : 1,
      max: typeof escalaRaw?.max === "number" ? escalaRaw.max : 5,
      labels,
    },
    perguntas,
  };
}

export async function carregarQuestionarioBigFive() {
  try {
    const data = await externalApiRequest<unknown>("/bigfive/questionario", {
      method: "GET",
    });

    const normalized = normalizeQuestionarioBigFive(data);
    if (!normalized) {
      throw new Error("Estrutura de questionário inválida.");
    }

    return {
      ok: true,
      status: 200,
      data: normalized,
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
