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

let estadosCache: Promise<ApiResult<EstadoOption[]>> | null = null;
const cidadesCache = new Map<string, Promise<ApiResult<CidadeOption[]>>>();
const bairrosCache = new Map<number, Promise<ApiResult<BairroOption[]>>>();

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
  if (!estadosCache) {
    estadosCache = (async () => {
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
  }

  return estadosCache;
}

export async function carregarCidadesPorUf(siglaUf: string) {
  const key = siglaUf.trim().toUpperCase();

  if (!cidadesCache.has(key)) {
    cidadesCache.set(
      key,
      (async () => {
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
      })(),
    );
  }

  return cidadesCache.get(key) as Promise<ApiResult<CidadeOption[]>>;
}

async function carregarSubdistritosPorMunicipio(municipioId: number) {
  return requestPublicApi<IbgeLocalidadeNomeada[]>(
    `/municipios/${municipioId}/subdistritos?orderBy=nome`,
    "Falha ao carregar bairros na API publica do IBGE.",
  );
}

export async function carregarBairrosPorMunicipio(municipioId: number) {
  if (!bairrosCache.has(municipioId)) {
    bairrosCache.set(
      municipioId,
      (async () => {
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
      })(),
    );
  }

  return bairrosCache.get(municipioId) as Promise<ApiResult<BairroOption[]>>;
}