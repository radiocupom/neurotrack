export type DashboardPrimitive = string | number | boolean;
export type DashboardFilterValue =
  | DashboardPrimitive
  | null
  | undefined
  | Array<DashboardPrimitive | null | undefined>;

export type DashboardFilters = Record<string, DashboardFilterValue>;

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

function appendFilterValue(params: URLSearchParams, key: string, value: DashboardFilterValue) {
  if (value == null) {
    return;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => (item == null ? "" : String(item).trim()))
      .filter(Boolean);

    if (items.length > 0) {
      params.set(key, items.join(","));
    }

    return;
  }

  const normalized = typeof value === "boolean" ? (value ? "true" : "false") : String(value).trim();

  if (!normalized) {
    return;
  }

  params.set(key, normalized);
}

export function serializeDashboardFilters(filters: DashboardFilters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    appendFilterValue(params, key, value);
  });

  return params.toString();
}

function withFilters(path: string, filters?: DashboardFilters) {
  const query = serializeDashboardFilters(filters ?? {});
  return query ? `${path}?${query}` : path;
}

export async function listarQuestionariosSenso() {
  return requestLocalApi<unknown[]>(
    "/api/dashboard/pesquisas/senso-populacional",
    { method: "GET" },
    "Falha ao carregar questionarios do dashboard de senso.",
  );
}

export async function listarPesquisasOpiniaoDashboard() {
  return requestLocalApi<unknown[]>(
    "/api/dashboard/pesquisas/opiniao",
    { method: "GET" },
    "Falha ao carregar pesquisas do dashboard de opiniao.",
  );
}

export async function obterResumoSenso(questionarioId: string, filtros?: DashboardFilters) {
  return requestLocalApi<unknown>(
    withFilters(`/api/dashboard/resultado/senso-populacional/${encodeURIComponent(questionarioId)}`, filtros),
    { method: "GET" },
    "Falha ao carregar resumo do dashboard de senso.",
  );
}

export async function obterParticipantesSenso(questionarioId: string, filtros?: DashboardFilters) {
  return requestLocalApi<unknown>(
    withFilters(`/api/dashboard/resultado/senso-populacional/${encodeURIComponent(questionarioId)}/participantes`, filtros),
    { method: "GET" },
    "Falha ao carregar participantes do dashboard de senso.",
  );
}

export async function obterAnaliseSenso(questionarioId: string, filtros?: DashboardFilters) {
  return requestLocalApi<unknown>(
    withFilters(`/api/dashboard/resultado/senso-populacional/${encodeURIComponent(questionarioId)}/analise-ia`, filtros),
    { method: "GET" },
    "Falha ao carregar analise IA do dashboard de senso.",
  );
}

export async function obterRelatorioSenso(questionarioId: string, filtros?: DashboardFilters) {
  return requestLocalApi<unknown>(
    withFilters(`/api/dashboard/resultado/senso-populacional/${encodeURIComponent(questionarioId)}/relatorio-ia`, filtros),
    { method: "GET" },
    "Falha ao carregar relatorio IA do dashboard de senso.",
  );
}

export async function obterResumoBigFive(filtros?: DashboardFilters) {
  return requestLocalApi<unknown>(
    withFilters("/api/dashboard/resultado/bigfive", filtros),
    { method: "GET" },
    "Falha ao carregar resumo do dashboard Big Five.",
  );
}

export async function obterResumoOpiniaoDashboard(pesquisaId: string, filtros?: DashboardFilters) {
  return requestLocalApi<unknown>(
    withFilters(`/api/dashboard/resultado/opiniao/${encodeURIComponent(pesquisaId)}`, filtros),
    { method: "GET" },
    "Falha ao carregar resumo do dashboard de opiniao.",
  );
}

export async function obterParticipantesOpiniaoDashboard(pesquisaId: string, filtros?: DashboardFilters) {
  return requestLocalApi<unknown>(
    withFilters(`/api/dashboard/resultado/opiniao/${encodeURIComponent(pesquisaId)}/participantes`, filtros),
    { method: "GET" },
    "Falha ao carregar participantes do dashboard de opiniao.",
  );
}

export async function obterAnaliseBigFive(filtros?: DashboardFilters) {
  return requestLocalApi<unknown>(
    withFilters("/api/dashboard/resultado/bigfive/analise-ia", filtros),
    { method: "GET" },
    "Falha ao carregar analise IA do dashboard Big Five.",
  );
}

export async function obterRelatorioBigFive(filtros?: DashboardFilters) {
  return requestLocalApi<unknown>(
    withFilters("/api/dashboard/resultado/bigfive/relatorio-ia", filtros),
    { method: "GET" },
    "Falha ao carregar relatorio IA do dashboard Big Five.",
  );
}
