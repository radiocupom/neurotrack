import type { PrecheckJornadaPublicaSenso } from "@/service/sensoPopulacional.service";

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

export async function carregarCampanhas() {
  return requestLocalApi<unknown>(
    "/api/senso-populacional/campanhas",
    { method: "GET" },
    "Falha ao carregar campanhas.",
  );
}

export async function carregarQuestionariosPrivados() {
  return requestLocalApi<unknown>(
    "/api/senso-populacional/questionarios",
    { method: "GET" },
    "Falha ao carregar questionarios.",
  );
}

export async function carregarQuestionarioSenso() {
  const result = await requestLocalApi<unknown>(
    "/api/senso-populacional/questionario",
    { method: "GET" },
    "Falha ao carregar questionario base do senso.",
  );

  if (!result.ok) return result as ApiResult<QuestionarioSensoBase>;

  const normalized = normalizeQuestionario(result.data);

  if (!normalized) {
    return {
      ok: false,
      status: 502,
      data: null,
      message: "Questionario do senso retornou em formato invalido.",
    } satisfies ApiResult<QuestionarioSensoBase>;
  }

  return {
    ok: true,
    status: result.status,
    data: normalized,
    message: "ok",
  } satisfies ApiResult<QuestionarioSensoBase>;
}

export async function precheckJornada({
  campanhaId,
  telefone,
  participanteId,
}: {
  campanhaId: string;
  telefone?: string;
  participanteId?: string;
}) {
  const query = new URLSearchParams();
  query.set("campanhaId", campanhaId);
  if (telefone) query.set("telefone", telefone);
  if (participanteId) query.set("participanteId", participanteId);

  return requestLocalApi<PrecheckJornadaPublicaSenso>(
    `/api/senso-populacional/precheck-jornada-publico?${query.toString()}`,
    { method: "GET" },
    "Falha ao validar jornada do participante.",
  );
}

export async function buscarParticipantePorContato(contato: string) {
  const query = new URLSearchParams();
  query.set("contato", contato);

  return requestLocalApi<unknown>(
    `/api/participantes/buscar-por-contato?${query.toString()}`,
    { method: "GET" },
    "Falha ao consultar participante.",
  );
}

export async function criarParticipante(payload: {
  nome: string;
  email?: string;
  contatoOpcional: string;
}) {
  return requestLocalApi<Record<string, unknown>>(
    "/api/participantes",
    {
      method: "POST",
      body: payload,
    },
    "Falha ao criar participante.",
  );
}

export async function criarCampanha(payload: {
  nome: string;
  descricao?: string;
  questionarioId: string;
}) {
  return requestLocalApi<Record<string, unknown>>(
    "/api/senso-populacional/campanhas",
    {
      method: "POST",
      body: payload,
    },
    "Falha ao criar campanha.",
  );
}

export async function enviarSenso(payload: {
  participanteId: string;
  questionarioId: string;
  campanhaId: string;
  estado: string;
  cidade: string;
  bairro: string;
  respostas: Array<{ perguntaId: string; opcaoId: string }>;
}) {
  return requestLocalApi<Record<string, unknown>>(
    "/api/senso-populacional/responder",
    {
      method: "POST",
      body: payload,
    },
    "Falha ao enviar respostas do senso.",
  );
}

export async function enviarBigFive(payload: {
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
}) {
  return requestLocalApi<Record<string, unknown>>(
    "/api/bigfive/avaliar",
    {
      method: "POST",
      body: payload,
    },
    "Falha ao enviar Big Five.",
  );
}

export async function carregarQuestionarioBigFive() {
  return requestLocalApi<unknown>(
    "/api/bigfive/questionario",
    { method: "GET" },
    "Falha ao carregar questionario Big Five.",
  );
}

export async function obterResultadoBigFive(participanteId: string) {
  return requestLocalApi<Record<string, unknown>>(
    `/api/bigfive/resultado/${encodeURIComponent(participanteId)}`,
    { method: "GET" },
    "Falha ao consultar resultado Big Five.",
  );
}