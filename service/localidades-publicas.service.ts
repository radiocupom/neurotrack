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

const ESTADOS_BRASIL_FALLBACK: EstadoOption[] = [
  { id: 12, sigla: "AC", nome: "Acre" },
  { id: 27, sigla: "AL", nome: "Alagoas" },
  { id: 16, sigla: "AP", nome: "Amapa" },
  { id: 13, sigla: "AM", nome: "Amazonas" },
  { id: 29, sigla: "BA", nome: "Bahia" },
  { id: 23, sigla: "CE", nome: "Ceara" },
  { id: 53, sigla: "DF", nome: "Distrito Federal" },
  { id: 32, sigla: "ES", nome: "Espirito Santo" },
  { id: 52, sigla: "GO", nome: "Goias" },
  { id: 21, sigla: "MA", nome: "Maranhao" },
  { id: 51, sigla: "MT", nome: "Mato Grosso" },
  { id: 50, sigla: "MS", nome: "Mato Grosso do Sul" },
  { id: 31, sigla: "MG", nome: "Minas Gerais" },
  { id: 15, sigla: "PA", nome: "Para" },
  { id: 25, sigla: "PB", nome: "Paraiba" },
  { id: 41, sigla: "PR", nome: "Parana" },
  { id: 26, sigla: "PE", nome: "Pernambuco" },
  { id: 22, sigla: "PI", nome: "Piaui" },
  { id: 33, sigla: "RJ", nome: "Rio de Janeiro" },
  { id: 24, sigla: "RN", nome: "Rio Grande do Norte" },
  { id: 43, sigla: "RS", nome: "Rio Grande do Sul" },
  { id: 11, sigla: "RO", nome: "Rondonia" },
  { id: 14, sigla: "RR", nome: "Roraima" },
  { id: 42, sigla: "SC", nome: "Santa Catarina" },
  { id: 35, sigla: "SP", nome: "Sao Paulo" },
  { id: 28, sigla: "SE", nome: "Sergipe" },
  { id: 17, sigla: "TO", nome: "Tocantins" },
];

function isEstadosPath(path: string) {
  return path.startsWith("/estados?");
}

function getEstadosFallbackResult<T>(): ApiResult<T> {
  return {
    ok: true,
    status: 200,
    data: sortByNome(ESTADOS_BRASIL_FALLBACK) as T,
    message: "ok",
  };
}

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
    const url = `${IBGE_BASE_URL}${path}`;
    console.log(`[localidades-service] Requisição iniciada: ${url}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      if (isEstadosPath(path)) {
        console.warn("[localidades-service] IBGE indisponivel para estados, usando fallback local.");
        return getEstadosFallbackResult<T>();
      }

      console.error(`[localidades-service] Erro na API - Status ${response.status}: ${fallbackMessage}`);
      return {
        ok: false,
        status: response.status,
        data: null,
        message: fallbackMessage,
      };
    }

    const payload = await response.json().catch((parseError) => {
      console.error(`[localidades-service] Erro ao fazer parse JSON:`, parseError);
      return null;
    });

    if (!payload) {
      if (isEstadosPath(path)) {
        console.warn("[localidades-service] Resposta de estados vazia, usando fallback local.");
        return getEstadosFallbackResult<T>();
      }

      console.error(`[localidades-service] Resposta vazia`);
      return {
        ok: false,
        status: response.status,
        data: null,
        message: "Resposta vazia da API",
      };
    }

    console.log(`[localidades-service] Sucesso na API - Status ${response.status}, Items: ${Array.isArray(payload) ? payload.length : 0}`);
    return {
      ok: true,
      status: response.status,
      data: payload as T,
      message: "ok",
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (isEstadosPath(path)) {
      console.warn(`[localidades-service] Falha de rede ao buscar estados (${errorMsg}), usando fallback local.`);
      return getEstadosFallbackResult<T>();
    }

    console.error(`[localidades-service] Erro de requisição: ${errorMsg}`);
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
    console.log("[localidades-service] Usando cache de estados");
    touchEntry(estadosCache, timestamp);
    return estadosCache.value;
  }

  console.log("[localidades-service] Carregando estados (sem cache)");
  const value = (async () => {
      const result = await requestPublicApi<IbgeEstado[]>(
        "/estados?orderBy=nome",
        "Falha ao carregar estados na API publica do IBGE.",
      );

      if (!result.ok) {
        console.error("[localidades-service] Falha ao carregar estados", result.message);
        return result as ApiResult<EstadoOption[]>;
      }

      const normalized = normalizeEstados(result.data);
      console.log(`[localidades-service] Estados carregados com sucesso: ${normalized.length} items`);
      return {
        ok: true,
        status: result.status,
        data: normalized,
        message: "ok",
      } satisfies ApiResult<EstadoOption[]>;
    })().then((result) => {
      if (!result.ok && estadosCache?.value === value) {
        estadosCache = null;
      }

      return result;
    });

  estadosCache = {
    value,
    expiresAt: timestamp + ESTADOS_CACHE_TTL_MS,
    lastAccessAt: timestamp,
  };

  return value;
}

export async function carregarCidadesPorUf(siglaUf: string) {
  const key = siglaUf.trim().toUpperCase();
  console.log(`[localidades-service] Carregando cidades para UF: ${key}`);
  const cached = getCachedEntry(cidadesCache, key);
  if (cached) {
    console.log(`[localidades-service] Usando cache de cidades para ${key}`);
    return cached;
  }

  const value = (async () => {
        const estadosResult = await carregarEstadosBrasileiros();

        if (!estadosResult.ok || !estadosResult.data) {
          console.error(`[localidades-service] Falha ao carregar estados para ${key}`);
          return {
            ok: false,
            status: estadosResult.status,
            data: null,
            message: estadosResult.message,
          } satisfies ApiResult<CidadeOption[]>;
        }

        const estado = estadosResult.data.find((item) => item.sigla === key);

        if (!estado) {
          console.error(`[localidades-service] Estado ${key} não encontrado`);
          return {
            ok: false,
            status: 404,
            data: null,
            message: "Estado selecionado nao foi encontrado na API publica do IBGE.",
          } satisfies ApiResult<CidadeOption[]>;
        }

        console.log(`[localidades-service] Carregando cidades para estado ID ${estado.id}`);
        const result = await requestPublicApi<IbgeCidade[]>(
          `/estados/${estado.id}/municipios?orderBy=nome`,
          "Falha ao carregar cidades na API publica do IBGE.",
        );

        if (!result.ok) {
          console.error(`[localidades-service] Falha ao carregar cidades para ${key}`);
          return result as ApiResult<CidadeOption[]>;
        }

        const normalized = normalizeCidades(result.data);
        console.log(`[localidades-service] Cidades carregadas para ${key}: ${normalized.length} items`);
        return {
          ok: true,
          status: result.status,
          data: normalized,
          message: "ok",
        } satisfies ApiResult<CidadeOption[]>;
      })().then((result) => {
        if (!result.ok) {
          cidadesCache.delete(key);
        }

        return result;
      });

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