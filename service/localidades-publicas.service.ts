const IBGE_BASE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades";

export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
};

export type EstadoOption = {
  id: number;
  sigla: string;
  nome: string;
};

export type CidadeOption = {
  id: number;
  nome: string;
};

export type BairroOption = {
  id: string;
  nome: string;
};

type IbgeEstado = {
  id: number;
  sigla: string;
  nome: string;
};

type IbgeCidade = {
  id: number;
  nome: string;
};

type IbgeLocalidadeNomeada = {
  id: number;
  nome: string;
};

type TimedCacheEntry<T> = {
  value: Promise<ApiResult<T>>;
  expiresAt: number;
  lastAccessAt: number;
};

function readPositiveIntEnv(name: string, fallback: number) {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

const ESTADOS_CACHE_TTL_MS = readPositiveIntEnv(
  "NEXT_PUBLIC_LOCALIDADES_CACHE_ESTADOS_TTL_MS",
  30 * 60 * 1000,
);
const CIDADES_CACHE_TTL_MS = readPositiveIntEnv(
  "NEXT_PUBLIC_LOCALIDADES_CACHE_CIDADES_TTL_MS",
  10 * 60 * 1000,
);
const BAIRROS_CACHE_TTL_MS = readPositiveIntEnv(
  "NEXT_PUBLIC_LOCALIDADES_CACHE_BAIRROS_TTL_MS",
  5 * 60 * 1000,
);
const MAX_CIDADES_CACHE_ENTRIES = readPositiveIntEnv(
  "NEXT_PUBLIC_LOCALIDADES_CACHE_MAX_CIDADES",
  30,
);
const MAX_BAIRROS_CACHE_ENTRIES = readPositiveIntEnv(
  "NEXT_PUBLIC_LOCALIDADES_CACHE_MAX_BAIRROS",
  80,
);

let estadosCache: TimedCacheEntry<EstadoOption[]> | null = null;
const cidadesCache = new Map<string, TimedCacheEntry<CidadeOption[]>>();
const bairrosCache = new Map<number, TimedCacheEntry<BairroOption[]>>();

function now() {
  return Date.now();
}

function isExpired(expiresAt: number, timestamp: number) {
  return timestamp >= expiresAt;
}

function touchEntry<T>(entry: TimedCacheEntry<T>, timestamp: number) {
  entry.lastAccessAt = timestamp;
}

function getCachedEntry<K, T>(
  cache: Map<K, TimedCacheEntry<T>>,
  key: K,
): Promise<ApiResult<T>> | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  const timestamp = now();
  if (isExpired(entry.expiresAt, timestamp)) {
    cache.delete(key);
    return null;
  }

  touchEntry(entry, timestamp);
  return entry.value;
}

function pruneExpiredEntries<K, T>(cache: Map<K, TimedCacheEntry<T>>, timestamp: number) {
  for (const [key, entry] of cache.entries()) {
    if (isExpired(entry.expiresAt, timestamp)) {
      cache.delete(key);
    }
  }
}

function enforceMaxEntries<K, T>(cache: Map<K, TimedCacheEntry<T>>, maxEntries: number) {
  if (cache.size <= maxEntries) {
    return;
  }

  const sortedEntries = [...cache.entries()].sort(
    (first, second) => first[1].lastAccessAt - second[1].lastAccessAt,
  );

  const overflowCount = cache.size - maxEntries;
  for (let index = 0; index < overflowCount; index += 1) {
    const keyToDelete = sortedEntries[index]?.[0];
    if (keyToDelete !== undefined) {
      cache.delete(keyToDelete);
    }
  }
}

function setCachedEntry<K, T>(
  cache: Map<K, TimedCacheEntry<T>>,
  key: K,
  value: Promise<ApiResult<T>>,
  ttlMs: number,
  maxEntries: number,
) {
  const timestamp = now();
  pruneExpiredEntries(cache, timestamp);

  cache.set(key, {
    value,
    expiresAt: timestamp + ttlMs,
    lastAccessAt: timestamp,
  });

  enforceMaxEntries(cache, maxEntries);
}

export function resetLocalidadesPublicasCacheForTests() {
  estadosCache = null;
  cidadesCache.clear();
  bairrosCache.clear();
}

function sortByNome<T extends { nome: string }>(items: T[]) {
  return [...items].sort((first, second) => first.nome.localeCompare(second.nome, "pt-BR"));
}

async function requestPublicApi<T>(path: string, fallbackMessage: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${IBGE_BASE_URL}${path}`, {
      method: "GET",
      cache: "force-cache",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null,
        message: fallbackMessage,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: payload as T,
      message: "ok",
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      message: fallbackMessage,
    };
  }
}

function normalizeEstados(payload: IbgeEstado[] | null): EstadoOption[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return sortByNome(
    payload
      .filter((item) => item && typeof item.id === "number" && typeof item.sigla === "string" && typeof item.nome === "string")
      .map((item) => ({
        id: item.id,
        sigla: item.sigla,
        nome: item.nome,
      })),
  );
}

function normalizeCidades(payload: IbgeCidade[] | null): CidadeOption[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return sortByNome(
    payload
      .filter((item) => item && typeof item.id === "number" && typeof item.nome === "string")
      .map((item) => ({
        id: item.id,
        nome: item.nome,
      })),
  );
}

function normalizeBairros(payload: IbgeLocalidadeNomeada[] | null): BairroOption[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const uniqueByNome = new Map<string, BairroOption>();

  payload.forEach((item) => {
    if (!item || typeof item.id !== "number" || typeof item.nome !== "string") {
      return;
    }

    const nome = item.nome.trim();
    if (!nome) {
      return;
    }

    const key = nome.toLocaleLowerCase("pt-BR");
    if (!uniqueByNome.has(key)) {
      uniqueByNome.set(key, {
        id: String(item.id),
        nome,
      });
    }
  });

  return sortByNome([...uniqueByNome.values()]);
}

export async function carregarEstadosBrasileiros() {
  const timestamp = now();
  if (estadosCache && !isExpired(estadosCache.expiresAt, timestamp)) {
    touchEntry(estadosCache, timestamp);
    return estadosCache.value;
  }

  const value = (async () => {
      const result = await requestPublicApi<IbgeEstado[]>(
        "/estados?orderBy=nome",
        "Falha ao carregar estados na API publica do IBGE.",
      );

      if (!result.ok) {
        return result as ApiResult<EstadoOption[]>;
      }

      return {
        ok: true,
        status: result.status,
        data: normalizeEstados(result.data),
        message: "ok",
      } satisfies ApiResult<EstadoOption[]>;
    })();

  estadosCache = {
    value,
    expiresAt: timestamp + ESTADOS_CACHE_TTL_MS,
    lastAccessAt: timestamp,
  };

  return value;
}

export async function carregarCidadesPorUf(siglaUf: string) {
  const key = siglaUf.trim().toUpperCase();
  const cached = getCachedEntry(cidadesCache, key);
  if (cached) {
    return cached;
  }

  const value = (async () => {
        const estadosResult = await carregarEstadosBrasileiros();

        if (!estadosResult.ok || !estadosResult.data) {
          return {
            ok: false,
            status: estadosResult.status,
            data: null,
            message: estadosResult.message,
          } satisfies ApiResult<CidadeOption[]>;
        }

        const estado = estadosResult.data.find((item) => item.sigla === key);

        if (!estado) {
          return {
            ok: false,
            status: 404,
            data: null,
            message: "Estado selecionado nao foi encontrado na API publica do IBGE.",
          } satisfies ApiResult<CidadeOption[]>;
        }

        const result = await requestPublicApi<IbgeCidade[]>(
          `/estados/${estado.id}/municipios?orderBy=nome`,
          "Falha ao carregar cidades na API publica do IBGE.",
        );

        if (!result.ok) {
          return result as ApiResult<CidadeOption[]>;
        }

        return {
          ok: true,
          status: result.status,
          data: normalizeCidades(result.data),
          message: "ok",
        } satisfies ApiResult<CidadeOption[]>;
      })();

  setCachedEntry(
    cidadesCache,
    key,
    value,
    CIDADES_CACHE_TTL_MS,
    MAX_CIDADES_CACHE_ENTRIES,
  );

  return value;
}

async function carregarSubdistritosPorMunicipio(municipioId: number) {
  return requestPublicApi<IbgeLocalidadeNomeada[]>(
    `/municipios/${municipioId}/subdistritos?orderBy=nome`,
    "Falha ao carregar bairros na API publica do IBGE.",
  );
}

export async function carregarBairrosPorMunicipio(municipioId: number) {
  const cached = getCachedEntry(bairrosCache, municipioId);
  if (cached) {
    return cached;
  }

  const value = (async () => {
        const subdistritosResult = await carregarSubdistritosPorMunicipio(municipioId);

        if (!subdistritosResult.ok) {
          return {
            ok: false,
            status: subdistritosResult.status,
            data: null,
            message: subdistritosResult.message,
          } satisfies ApiResult<BairroOption[]>;
        }

        const bairros = normalizeBairros(subdistritosResult.data);

        return {
          ok: true,
          status: subdistritosResult.status,
          data: bairros,
          message: bairros.length > 0 ? "ok" : "Nenhum bairro publico foi encontrado para este municipio.",
        } satisfies ApiResult<BairroOption[]>;
      })();

  setCachedEntry(
    bairrosCache,
    municipioId,
    value,
    BAIRROS_CACHE_TTL_MS,
    MAX_BAIRROS_CACHE_ENTRIES,
  );

  return value;
}