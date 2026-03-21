const API_BASE_URL = process.env.NEURO_TRACK_API_URL ?? "http://localhost:3003/api";
const PRIVATE_API_TOKEN = process.env.PRIVATE_API_TOKEN ?? "";

type Primitive = string | number | boolean;

type QueryValue = Primitive | null | undefined | Array<Primitive | null | undefined>;

export type ExternalApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: BodyInit | Record<string, unknown> | null;
  headers?: HeadersInit;
  query?: Record<string, QueryValue>;
  token?: string;
  requiresAuth?: boolean;
  requiresPrivateToken?: boolean;
};

export class ExternalApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ExternalApiError";
    this.status = status;
    this.data = data;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  if (!query) {
    return url.toString();
  }

  Object.entries(query).forEach(([key, value]) => {
    if (value == null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item != null) {
          url.searchParams.append(key, String(item));
        }
      });

      return;
    }

    url.searchParams.append(key, String(value));
  });

  return url.toString();
}

function readErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as {
    message?: unknown;
    erro?: unknown;
    error?: { message?: unknown };
  };

  if (typeof candidate.message === "string") {
    return candidate.message;
  }

  if (typeof candidate.erro === "string") {
    return candidate.erro;
  }

  if (typeof candidate.error?.message === "string") {
    return candidate.error.message;
  }

  return null;
}

function buildHeaders(options: ExternalApiRequestOptions, body?: BodyInit | null) {
  const headers = new Headers(options.headers);

  if (body && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.requiresAuth) {
    if (!options.token) {
      throw new ExternalApiError("Token JWT nao informado para rota privada.", 401, null);
    }

    headers.set("Authorization", `Bearer ${options.token}`);
  }

  if (options.requiresPrivateToken) {
    if (!PRIVATE_API_TOKEN) {
      throw new ExternalApiError("PRIVATE_API_TOKEN nao configurado no ambiente.", 500, null);
    }

    headers.set("x-private-token", PRIVATE_API_TOKEN);
  }

  return headers;
}

function normalizeBody(body: ExternalApiRequestOptions["body"]) {
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

  if (isPlainObject(body)) {
    return JSON.stringify(body);
  }

  return body as BodyInit;
}

async function parseResponse(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => null);
}

export async function externalApiRequest<T>(
  path: string,
  options: ExternalApiRequestOptions = {},
) {
  const body = normalizeBody(options.body);
  const headers = buildHeaders(options, body);
  const response = await fetch(buildUrl(path, options.query), {
    ...options,
    headers,
    body,
    cache: options.cache ?? "no-store",
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ExternalApiError(
      readErrorMessage(data) ?? "Falha ao comunicar com a API externa.",
      response.status,
      data,
    );
  }

  return data as T;
}

export async function externalApiRequestWithMeta<T>(
  path: string,
  options: ExternalApiRequestOptions = {},
) {
  const body = normalizeBody(options.body);
  const headers = buildHeaders(options, body);
  const response = await fetch(buildUrl(path, options.query), {
    ...options,
    headers,
    body,
    cache: options.cache ?? "no-store",
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ExternalApiError(
      readErrorMessage(data) ?? "Falha ao comunicar com a API externa.",
      response.status,
      data,
    );
  }

  return {
    status: response.status,
    data: data as T,
  };
}

export function getExternalApiConfig() {
  return {
    baseUrl: API_BASE_URL,
    hasPrivateToken: Boolean(PRIVATE_API_TOKEN),
  };
}

export function readExternalApiErrorMessage(error: unknown) {
  if (error instanceof ExternalApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Erro inesperado na integracao com a API externa.";
}
