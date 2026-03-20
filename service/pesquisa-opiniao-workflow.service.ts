import type {
  AtualizarPesquisaOpiniaoPayload,
  Participante,
  CriarPesquisaOpiniaoPayload,
  PesquisaDetalhe,
  PesquisaOpiniao,
  RespostaRegistrada,
} from "@/types/pesquisa-opiniao";

export type PesquisaOpiniaoPrimitive = string | number | boolean;
export type PesquisaOpiniaoFilterValue =
  | PesquisaOpiniaoPrimitive
  | null
  | undefined
  | Array<PesquisaOpiniaoPrimitive | null | undefined>;

export type PesquisaOpiniaoFilters = Record<string, PesquisaOpiniaoFilterValue>;

export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
};

type LocalApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: BodyInit | Record<string, unknown> | null;
  headers?: HeadersInit;
};

function readMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;

  const candidate = payload as {
    message?: unknown;
    erro?: unknown;
    error?: { message?: unknown };
  };

  if (typeof candidate.message === "string") return candidate.message;
  if (typeof candidate.erro === "string") return candidate.erro;
  if (typeof candidate.error?.message === "string") return candidate.error.message;

  return fallback;
}

function normalizeBody(body: LocalApiRequestOptions["body"]) {
  if (body == null) {
    return null;
  }

  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  ) {
    return body;
  }

  return JSON.stringify(body);
}

async function parseJsonResponse(response: Response) {
  if (response.status === 204) {
    return null;
  }

  return response.json().catch(() => null);
}

async function requestLocalApi<T>(
  path: string,
  init: LocalApiRequestOptions,
  fallbackMessage: string,
): Promise<ApiResult<T>> {
  const body = normalizeBody(init.body);
  const headers = new Headers(init.headers);

  if (body && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    body,
    headers,
    cache: init.cache ?? "no-store",
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data: null,
      message: readMessage(payload, fallbackMessage),
    };
  }

  return {
    ok: true,
    status: response.status,
    data: payload as T,
    message: "ok",
  };
}

export async function listarPesquisasOpiniao() {
  return requestLocalApi<PesquisaOpiniao[]>(
    "/api/pesquisa-de-opniao",
    { method: "GET" },
    "Falha ao carregar pesquisas de opiniao.",
  );
}

export async function obterPesquisaOpiniao(pesquisaId: string) {
  return requestLocalApi<PesquisaDetalhe>(
    `/api/pesquisa-de-opniao/${encodeURIComponent(pesquisaId)}`,
    { method: "GET" },
    "Falha ao carregar pesquisa de opiniao.",
  );
}

export async function buscarParticipanteOpiniaoPorContato(contato: string) {
  return requestLocalApi<Participante>(
    `/api/pesquisa-de-opniao/buscar-por-contato?contato=${encodeURIComponent(contato)}`,
    { method: "GET" },
    "Falha ao buscar participante por contato.",
  );
}

export async function criarParticipanteOpiniao(payload: {
  nome: string;
  email?: string;
  contatoOpcional?: string;
}) {
  return requestLocalApi<Participante>(
    "/api/participantes",
    { method: "POST", body: payload },
    "Falha ao criar participante.",
  );
}

export async function identificarParticipanteOpiniaoPublico(payload: {
  nome: string;
  telefone: string;
  email?: string;
}) {
  return requestLocalApi<Participante>(
    "/api/participantes/identificar",
    { method: "POST", body: payload },
    "Falha ao identificar participante.",
  );
}

export async function responderPesquisaOpiniaoPrivada(payload: {
  participanteId: string;
  pesquisaId: string;
  estado: string;
  cidade: string;
  bairro: string;
  latitude?: number | null;
  longitude?: number | null;
  respostas: Array<{ perguntaId: string; opcaoRespostaId: string }>;
}) {
  return requestLocalApi<{ status?: string; data?: RespostaRegistrada }>(
    "/api/pesquisa-de-opniao/responder",
    { method: "POST", body: payload },
    "Falha ao responder pesquisa (privado).",
  );
}

export async function responderPesquisaOpiniaoPublica(
  pesquisaId: string,
  payload: {
    telefone: string;
    nome?: string;
    email?: string;
    estado: string;
    cidade: string;
    bairro: string;
    respostas: Array<{ perguntaId: string; opcaoRespostaId: string }>;
  },
) {
  return requestLocalApi<{ status?: string; data?: RespostaRegistrada }>(
    `/api/pesquisa-de-opniao/${encodeURIComponent(pesquisaId)}/responder-publico`,
    { method: "POST", body: payload },
    "Falha ao responder pesquisa (publico).",
  );
}

export async function criarPesquisaOpiniao(payload: CriarPesquisaOpiniaoPayload) {
  return requestLocalApi<PesquisaDetalhe>(
    "/api/pesquisa-de-opniao",
    { method: "POST", body: payload },
    "Falha ao criar pesquisa de opiniao.",
  );
}

export async function atualizarPesquisaOpiniao(pesquisaId: string, payload: AtualizarPesquisaOpiniaoPayload) {
  return requestLocalApi<PesquisaDetalhe>(
    `/api/pesquisa-de-opniao/${encodeURIComponent(pesquisaId)}`,
    { method: "PUT", body: payload },
    "Falha ao atualizar pesquisa de opiniao.",
  );
}

export async function excluirPesquisaOpiniao(pesquisaId: string) {
  return requestLocalApi<{ message?: string }>(
    `/api/pesquisa-de-opniao/${encodeURIComponent(pesquisaId)}`,
    { method: "DELETE" },
    "Falha ao excluir pesquisa de opiniao.",
  );
}
