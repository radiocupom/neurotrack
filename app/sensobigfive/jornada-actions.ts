"use server";

import { getSession } from "@/lib/auth/session";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import {
  carregarQuestionarioBigFive,
  avaliarBigFiveFromExternalApi,
  avaliarBigFivePublicoFromExternalApi,
  obterResultadoBigFiveFromExternalApi,
  type BigFiveCamposExtrasPayload,
} from "@/service/bigfive.service";
import {
  buscarParticipantePorContatoFromExternalApi,
  criarParticipanteFromExternalApi,
} from "@/service/participantes.service";
import {
  atualizarCampanhaSensoFromExternalApi,
  criarCampanhaSensoFromExternalApi,
  listarCampanhasSensoFromExternalApi,
  listarQuestionariosSensoFromExternalApi,
  obterQuestionarioBaseSensoFromExternalApi,
  precheckJornadaPublicaSensoFromExternalApi,
  responderSensoFromExternalApi,
  responderSensoPublicoFromExternalApi,
  type PrecheckJornadaPublicaSenso,
} from "@/service/sensoPopulacional.service";

type SensoPerguntaOpcao = {
  id: string;
  texto: string;
};

export type SensoPergunta = {
  id: string;
  texto: string;
  opcoes: SensoPerguntaOpcao[];
};

export type QuestionarioSensoBase = {
  id: string;
  slug?: string;
  titulo: string;
  perguntas: SensoPergunta[];
};

export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
};

type ScorePayload = {
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

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeOpcoes(value: unknown): SensoPerguntaOpcao[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const raw = readObject(item);
      if (!raw || typeof raw.id !== "string") return null;

      const texto =
        typeof raw.texto === "string"
          ? raw.texto.trim()
          : typeof raw.titulo === "string"
            ? raw.titulo.trim()
            : raw.id;

      return { id: raw.id, texto: texto || raw.id };
    })
    .filter((item): item is SensoPerguntaOpcao => item != null);
}

function normalizePerguntas(value: unknown): SensoPergunta[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const raw = readObject(item);
      if (!raw || typeof raw.id !== "string") return null;

      const texto =
        typeof raw.texto === "string"
          ? raw.texto.trim()
          : typeof raw.titulo === "string"
            ? raw.titulo.trim()
            : "Pergunta";

      const opcoes = normalizeOpcoes(raw.opcoes);

      if (!opcoes.length) return null;

      return {
        id: raw.id,
        texto: texto || "Pergunta",
        opcoes,
      };
    })
    .filter((item): item is SensoPergunta => item != null);
}

function normalizeQuestionario(payload: unknown): QuestionarioSensoBase | null {
  const root = readObject(payload);
  const candidate = readObject(root?.questionario) ?? root;

  if (!candidate) return null;

  const id = typeof candidate.id === "string" ? candidate.id : "";
  const titulo =
    typeof candidate.titulo === "string"
      ? candidate.titulo.trim()
      : typeof candidate.nome === "string"
        ? candidate.nome.trim()
        : "Senso Populacional";

  const perguntas = normalizePerguntas(candidate.perguntas);

  if (!id || !perguntas.length) return null;

  return {
    id,
    slug: typeof candidate.slug === "string" ? candidate.slug : undefined,
    titulo,
    perguntas,
  };
}

async function requireToken() {
  const session = await getSession();
  if (!session?.token) {
    return { ok: false as const, message: "Sessao nao autenticada.", status: 401 };
  }

  return { ok: true as const, token: session.token };
}

function toApiError<T>(error: unknown, fallbackMessage: string): ApiResult<T> {
  if (error instanceof ExternalApiError) {
    return {
      ok: false,
      status: error.status,
      data: null,
      message: readExternalApiErrorMessage(error) || fallbackMessage,
    };
  }

  return {
    ok: false,
    status: 500,
    data: null,
    message: fallbackMessage,
  };
}

export async function carregarCampanhas(): Promise<ApiResult<unknown>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await listarCampanhasSensoFromExternalApi(auth.token);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return toApiError(error, "Falha ao carregar campanhas.");
  }
}

export async function carregarQuestionariosPrivados(): Promise<ApiResult<unknown>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await listarQuestionariosSensoFromExternalApi(auth.token);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return toApiError(error, "Falha ao carregar questionarios.");
  }
}

export async function carregarQuestionarioSenso(): Promise<ApiResult<QuestionarioSensoBase>> {
  try {
    const data = await obterQuestionarioBaseSensoFromExternalApi();
    const normalized = normalizeQuestionario(data);

    if (!normalized) {
      return {
        ok: false,
        status: 502,
        data: null,
        message: "Questionario do senso retornou em formato invalido.",
      };
    }

    return { ok: true, status: 200, data: normalized, message: "ok" };
  } catch (error) {
    return toApiError(error, "Falha ao carregar questionario base do senso.");
  }
}

export async function precheckJornada({
  campanhaId,
  telefone,
  participanteId,
}: {
  campanhaId: string;
  telefone?: string;
  participanteId?: string;
}): Promise<ApiResult<PrecheckJornadaPublicaSenso>> {
  try {
    const data = await precheckJornadaPublicaSensoFromExternalApi({ campanhaId, telefone, participanteId });
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return toApiError(error, "Falha ao validar jornada do participante.");
  }
}

export async function buscarParticipantePorContato(contato: string): Promise<ApiResult<unknown>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await buscarParticipantePorContatoFromExternalApi(auth.token, contato);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return toApiError(error, "Falha ao consultar participante.");
  }
}

export async function criarParticipante(payload: {
  nome: string;
  email?: string;
  contatoOpcional: string;
}): Promise<ApiResult<Record<string, unknown>>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await criarParticipanteFromExternalApi(auth.token, payload);
    return { ok: true, status: 200, data: data as Record<string, unknown>, message: "ok" };
  } catch (error) {
    return toApiError(error, "Falha ao criar participante.");
  }
}

export async function criarCampanha(payload: {
  nome: string;
  descricao?: string;
  questionarioId: string;
}): Promise<ApiResult<Record<string, unknown>>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await criarCampanhaSensoFromExternalApi(auth.token, payload);
    return { ok: true, status: 200, data: data as Record<string, unknown>, message: "ok" };
  } catch (error) {
    return toApiError(error, "Falha ao criar campanha.");
  }
}

export async function atualizarCampanha(
  campanhaId: string,
  payload: {
    ativa: boolean;
    nome?: string;
    descricao?: string;
  },
): Promise<ApiResult<Record<string, unknown>>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await atualizarCampanhaSensoFromExternalApi(auth.token, campanhaId, payload);
    return { ok: true, status: 200, data: data as Record<string, unknown>, message: "ok" };
  } catch (error) {
    return toApiError(error, "Falha ao atualizar campanha.");
  }
}

export async function enviarSenso(payload: {
  participanteId: string;
  questionarioId: string;
  campanhaId: string;
  estado: string;
  cidade: string;
  bairro: string;
  respostas: Array<{ perguntaId: string; opcaoId: string }>;
}): Promise<ApiResult<Record<string, unknown>>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const { status, data } = await responderSensoFromExternalApi(auth.token, payload);
    return { ok: true, status, data: (data ?? {}) as Record<string, unknown>, message: "ok" };
  } catch (error) {
    return toApiError(error, "Falha ao enviar respostas do senso.");
  }
}

export async function enviarBigFive(payload: ScorePayload): Promise<ApiResult<Record<string, unknown>>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const { status, data } = await avaliarBigFiveFromExternalApi(auth.token, payload);
    return { ok: true, status, data: (data ?? {}) as Record<string, unknown>, message: "ok" };
  } catch (error) {
    return toApiError(error, "Falha ao enviar Big Five.");
  }
}

export async function enviarSensoPublico(payload: {
  telefone: string;
  nome?: string;
  email?: string;
  questionarioId: string;
  campanhaId: string;
  estado: string;
  cidade: string;
  bairro: string;
  respostas: Array<{ perguntaId: string; opcaoId: string }>;
  canal?: "WHATSAPP" | "TELEFONE" | "PRESENCIAL" | "OUTRO";
  idade?: number;
}): Promise<ApiResult<Record<string, unknown>>> {
  try {
    const { status, data } = await responderSensoPublicoFromExternalApi({
      ...payload,
      telefone: payload.telefone.trim(),
      nome: payload.nome?.trim() || undefined,
      email: payload.email?.trim() || undefined,
      canal: payload.canal ?? "WHATSAPP",
    });

    return { ok: true, status, data: (data ?? {}) as Record<string, unknown>, message: "ok" };
  } catch (error) {
    return toApiError(error, "Falha ao enviar respostas do senso no fluxo público.");
  }
}

export async function enviarBigFivePublico(payload: {
  telefone: string;
  nome?: string;
  email?: string;
  campanhaId: string;
  abertura1: number;
  abertura2: number;
  abertura3: number;
  participanteId: string;
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
  canal?: "WHATSAPP" | "TELEFONE" | "PRESENCIAL" | "OUTRO";
  idade?: number;
  estado?: string;
  cidade?: string;
  bairro?: string;
}): Promise<ApiResult<Record<string, unknown>>> {
  try {
    const { status, data } = await avaliarBigFivePublicoFromExternalApi({
      ...payload,
      telefone: payload.telefone.trim(),
      nome: payload.nome?.trim() || undefined,
      email: payload.email?.trim() || undefined,
      participanteId: payload.participanteId.trim(),
      canal: payload.canal ?? "WHATSAPP",
    });

    return { ok: true, status, data: (data ?? {}) as Record<string, unknown>, message: "ok" };
  } catch (error) {
    return toApiError(error, "Falha ao enviar Big Five no fluxo público.");
  }
}

export async function carregarQuestionarioBigFiveAction(): Promise<ApiResult<unknown>> {
  return carregarQuestionarioBigFive();
}

export async function obterResultadoBigFive(participanteId: string): Promise<ApiResult<Record<string, unknown>>> {
  const auth = await requireToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await obterResultadoBigFiveFromExternalApi(auth.token, participanteId);
    return { ok: true, status: 200, data: (data ?? {}) as Record<string, unknown>, message: "ok" };
  } catch (error) {
    return toApiError(error, "Falha ao consultar resultado Big Five.");
  }
}