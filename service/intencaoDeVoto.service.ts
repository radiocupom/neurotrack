import {
  externalApiRequest,
  externalApiRequestWithMeta,
  getExternalApiConfig,
  readExternalApiErrorMessage,
} from "@/service/api";
import type {
  ApiResponse,
  AtualizarPesquisaIntencaoVotoPayload,
  CanalVoto,
  CandidatoIntencaoVoto,
  CandidatoIntencaoVotoInput,
  CriarPesquisaIntencaoVotoPayload,
  ParticipanteIntencaoVoto,
  PesquisaIntencaoVoto,
  PesquisaIntencaoVotoDetalhe,
  PayloadRegistrarVotoPrivado,
  PayloadRegistrarVotoPublico,
  RankingCandidatoIntencaoVoto,
  ResultadoIntencaoVoto,
  StatusFilaIntencaoVoto,
  VotoGeolocalizadoIntencaoVoto,
  VotoRegistrado,
  VotosPorCanalIntencaoVoto,
} from "@/types/intencao-voto";

const MODULE_PATH = "/intencao-voto";

type JsonRecord = Record<string, unknown>;

type PesquisaFilters = {
  pesquisaId?: string;
  participanteId?: string;
  telefone?: string;
  candidatoId?: string;
  idadeMin?: number;
  idadeMax?: number;
  canal?: string;
  estado?: string;
  cidade?: string;
  bairro?: string;
  limit?: number;
  offset?: number;
  apenasComCoordenada?: boolean;
};

function privateRequest<T>(path: string, token: string, options: Parameters<typeof externalApiRequest<T>>[1] = {}) {
  return externalApiRequest<T>(path, {
    ...options,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

function privateRequestWithMeta<T>(
  path: string,
  token: string,
  options: Parameters<typeof externalApiRequestWithMeta<T>>[1] = {},
) {
  return externalApiRequestWithMeta<T>(path, {
    ...options,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

function readObject(value: unknown): JsonRecord | null {
  return value && typeof value === "object" ? (value as JsonRecord) : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function unwrapPayload<T = unknown>(value: unknown): T {
  const raw = readObject(value);
  if (!raw) {
    return value as T;
  }

  const candidates = [raw.data, raw.resultado, raw.item, raw.items, raw.pesquisa, raw.pesquisas];
  for (const candidate of candidates) {
    if (candidate != null) {
      return candidate as T;
    }
  }

  return value as T;
}

function getApiOrigin() {
  try {
    return new URL(getExternalApiConfig().baseUrl).origin;
  } catch {
    return "";
  }
}

function resolverFotoCandidato(fotoUrl: string | null | undefined) {
  if (!fotoUrl) {
    return null;
  }

  if (fotoUrl.startsWith("http://") || fotoUrl.startsWith("https://")) {
    return fotoUrl;
  }

  const origin = getApiOrigin();
  if (!origin) {
    return fotoUrl;
  }

  return fotoUrl.startsWith("/") ? `${origin}${fotoUrl}` : `${origin}/${fotoUrl}`;
}

function normalizeCandidato(value: unknown, fallbackIndex = 0): CandidatoIntencaoVoto {
  const raw = readObject(value) ?? {};
  return {
    id: readString(raw.id) || `candidato-${fallbackIndex}`,
    nome: readString(raw.nome) || `Candidato ${fallbackIndex + 1}`,
    partido: readNullableString(raw.partido),
    fotoUrl: resolverFotoCandidato(readNullableString(raw.fotoUrl)),
  };
}

function normalizeRankingItem(value: unknown, fallbackIndex = 0): RankingCandidatoIntencaoVoto {
  const raw = readObject(value) ?? {};
  const candidato = readObject(raw.candidato);
  return {
    candidatoId: readString(raw.candidatoId) || readString(candidato?.id) || `candidato-${fallbackIndex}`,
    nome: readString(raw.nome) || readString(candidato?.nome) || `Candidato ${fallbackIndex + 1}`,
    partido: readNullableString(raw.partido) ?? readNullableString(candidato?.partido),
    fotoUrl: resolverFotoCandidato(readNullableString(raw.fotoUrl) ?? readNullableString(candidato?.fotoUrl)),
    votos: readNumber(raw.votos ?? raw.total),
    percentual: readNullableNumber(raw.percentual),
  };
}

function normalizeCanalItem(value: unknown): VotosPorCanalIntencaoVoto | null {
  const raw = readObject(value);
  if (!raw) {
    return null;
  }

  const canal = readString(raw.canal) || readString(raw.nome);
  if (!canal) {
    return null;
  }

  return {
    canal,
    total: readNumber(raw.total ?? raw.votos),
  };
}

function normalizeVotoGeolocalizado(value: unknown, fallbackIndex = 0): VotoGeolocalizadoIntencaoVoto {
  const raw = readObject(value) ?? {};
  const coordenada = readObject(raw.coordenada);
  const candidato = readObject(raw.candidato);
  const participante = readObject(raw.participante);
  const entrevistador = readObject(raw.entrevistador);

  return {
    id: readString(raw.id) || `voto-${fallbackIndex}`,
    canal: readNullableString(raw.canal),
    idade: readNullableNumber(raw.idade),
    estado: readNullableString(raw.estado),
    cidade: readNullableString(raw.cidade),
    bairro: readNullableString(raw.bairro),
    latitude: readNullableNumber(raw.latitude),
    longitude: readNullableNumber(raw.longitude),
    coordenada: coordenada
      ? {
          latitude: readNullableNumber(coordenada.latitude),
          longitude: readNullableNumber(coordenada.longitude),
        }
      : null,
    criadoEm: readString(raw.criadoEm) || readString(raw.respondidoEm) || undefined,
    candidato: candidato
      ? {
          id: readString(candidato.id) || undefined,
          nome: readNullableString(candidato.nome),
          partido: readNullableString(candidato.partido),
          fotoUrl: resolverFotoCandidato(readNullableString(candidato.fotoUrl)),
        }
      : undefined,
    participante: participante
      ? {
          id: readString(participante.id) || undefined,
          nome: readNullableString(participante.nome),
          contatoOpcional: readNullableString(participante.contatoOpcional),
        }
      : undefined,
    entrevistador: entrevistador
      ? {
          id: readString(entrevistador.id) || undefined,
          nome: readNullableString(entrevistador.nome),
          email: readNullableString(entrevistador.email),
        }
      : undefined,
  };
}

function normalizeResultado(value: unknown): ResultadoIntencaoVoto {
  const raw = readObject(unwrapPayload(value)) ?? {};
  const rankingRaw = Array.isArray(raw.ranking) ? raw.ranking : Array.isArray(raw.resultado) ? raw.resultado : [];
  const canaisRaw = Array.isArray(raw.votosPorCanal) ? raw.votosPorCanal : Array.isArray(raw.canais) ? raw.canais : [];
  const geoRaw = Array.isArray(raw.votosGeolocalizados)
    ? raw.votosGeolocalizados
    : Array.isArray(raw.participantes)
      ? raw.participantes
      : [];

  if (
    Object.keys(raw).length > 0 &&
    rankingRaw.length === 0 &&
    canaisRaw.length === 0 &&
    geoRaw.length === 0 &&
    raw.totalVotos == null &&
    raw.total == null
  ) {
    console.warn("[intencao-voto] payload de resultados com estrutura inesperada", raw);
  }

  return {
    totalVotos: readNumber(raw.totalVotos ?? raw.total),
    ranking: rankingRaw.map((item, index) => normalizeRankingItem(item, index)),
    votosPorCanal: canaisRaw
      .map((item) => normalizeCanalItem(item))
      .filter((item): item is VotosPorCanalIntencaoVoto => item != null),
    votosGeolocalizados: geoRaw.map((item, index) => normalizeVotoGeolocalizado(item, index)),
    cache: readObject(raw.cache) ?? null,
  };
}

function normalizePesquisa(value: unknown, includeResultado = false): PesquisaIntencaoVotoDetalhe | null {
  const raw = readObject(unwrapPayload(value));
  if (!raw) {
    return null;
  }

  const candidatosRaw = Array.isArray(raw.candidatos) ? raw.candidatos : [];

  return {
    id: readString(raw.id),
    titulo: readString(raw.titulo) || "Pesquisa de intenção de voto",
    descricao: readNullableString(raw.descricao),
    cargo: readString(raw.cargo) || "Cargo não informado",
    ativo: readBoolean(raw.ativo, true),
    urlPesquisa: readNullableString(raw.urlPesquisa),
    idRegistroTSE: readNullableString(raw.idRegistroTSE),
    criadoPorId: readNullableString(raw.criadoPorId),
    criadoEm: readString(raw.criadoEm) || undefined,
    candidatos: candidatosRaw.map((item, index) => normalizeCandidato(item, index)),
    resultado: includeResultado
      ? normalizeResultado({
          totalVotos: raw.totalVotos,
          ranking: raw.ranking,
          votosPorCanal: raw.votosPorCanal,
          votosGeolocalizados: raw.votosGeolocalizados,
          cache: raw.cache,
        })
      : undefined,
  };
}

function normalizePesquisaList(payload: unknown): PesquisaIntencaoVoto[] {
  const unwrapped = unwrapPayload<unknown>(payload);
  const root = readObject(unwrapped);
  const items = Array.isArray(unwrapped)
    ? unwrapped
    : Array.isArray(root?.items)
      ? (root.items as unknown[])
      : Array.isArray(root?.pesquisas)
        ? (root.pesquisas as unknown[])
        : [];

  return items
    .map((item) => normalizePesquisa(item, false))
    .filter((item): item is PesquisaIntencaoVoto => item != null);
}

function normalizeParticipante(value: unknown): ParticipanteIntencaoVoto | null {
  const raw = readObject(unwrapPayload(value));
  if (!raw) {
    return null;
  }

  const id = readString(raw.participanteId) || readString(raw.id);
  const nome = readString(raw.nome);
  if (!id || !nome) {
    return null;
  }

  return {
    id,
    participanteId: readString(raw.participanteId) || undefined,
    nome,
    email: readNullableString(raw.email),
    contatoOpcional: readNullableString(raw.contatoOpcional),
    telefone: readNullableString(raw.telefone),
    criadoEm: readString(raw.criadoEm) || undefined,
  };
}

function normalizeVotoRegistrado(value: unknown): VotoRegistrado | null {
  const raw = readObject(unwrapPayload(value));
  if (!raw) {
    return null;
  }

  return {
    id: readString(raw.id),
    pesquisaId: readString(raw.pesquisaId) || undefined,
    participanteId: readString(raw.participanteId) || undefined,
    candidatoId: readString(raw.candidatoId) || undefined,
    canal: readString(raw.canal) || undefined,
    criadoEm: readString(raw.criadoEm) || readString(raw.respondidoEm) || undefined,
  };
}

function normalizeCandidatosPayload(candidatos: CandidatoIntencaoVotoInput[]) {
  return candidatos.map((item) => ({
    ...(item.id ? { id: item.id } : {}),
    nome: item.nome.trim(),
    partido: item.partido.trim(),
    ...(item.fotoUrl?.trim() ? { fotoUrl: item.fotoUrl.trim() } : {}),
  }));
}

function normalizePesquisaPayload(payload: CriarPesquisaIntencaoVotoPayload | AtualizarPesquisaIntencaoVotoPayload) {
  const normalized: JsonRecord = {};

  if ("titulo" in payload && typeof payload.titulo === "string" && payload.titulo.trim()) {
    normalized.titulo = payload.titulo.trim();
  }
  if ("descricao" in payload) {
    normalized.descricao = payload.descricao?.trim() || undefined;
  }
  if ("idRegistroTSE" in payload) {
    normalized.idRegistroTSE = payload.idRegistroTSE?.trim() || undefined;
  }
  if ("urlPesquisa" in payload) {
    normalized.urlPesquisa = payload.urlPesquisa?.trim() || undefined;
  }
  if ("cargo" in payload && typeof payload.cargo === "string" && payload.cargo.trim()) {
    normalized.cargo = payload.cargo.trim();
  }
  if ("criadoPorId" in payload && typeof payload.criadoPorId === "string" && payload.criadoPorId.trim()) {
    normalized.criadoPorId = payload.criadoPorId.trim();
  }
  if ("ativo" in payload && typeof payload.ativo === "boolean") {
    normalized.ativo = payload.ativo;
  }
  if (Array.isArray(payload.candidatos)) {
    normalized.candidatos = normalizeCandidatosPayload(payload.candidatos);
  }

  return normalized;
}

function summarizePesquisaRequestForLog(body: JsonRecord | FormData) {
  if (!(body instanceof FormData)) {
    return body;
  }

  const serialized: JsonRecord = {};
  for (const [key, value] of body.entries()) {
    const nextValue =
      typeof File !== "undefined" && value instanceof File
        ? { name: value.name, size: value.size, type: value.type }
        : value;

    if (key in serialized) {
      const currentValue = serialized[key];
      serialized[key] = Array.isArray(currentValue) ? [...currentValue, nextValue] : [currentValue, nextValue];
      continue;
    }

    serialized[key] = nextValue;
  }

  return serialized;
}

function mapApiError<T>(error: unknown, fallbackMessage: string): ApiResponse<T> {
  const status =
    error && typeof error === "object" && "status" in error
      ? ((error as { status: unknown }).status as number)
      : 500;

  return {
    ok: false,
    status,
    data: null,
    message: readExternalApiErrorMessage(error) || fallbackMessage,
  };
}

function buildPesquisaResponse(
  status: number,
  payload: unknown,
  fallbackMessage: string,
): ApiResponse<PesquisaIntencaoVotoDetalhe> {
  return {
    ok: true,
    status,
    data: normalizePesquisa(payload, true),
    message: status === 202 ? "Solicitação recebida e enfileirada para processamento." : fallbackMessage,
  };
}

export async function criarPesquisaIntencaoDeVoto(
  token: string,
  payload: CriarPesquisaIntencaoVotoPayload | FormData,
): Promise<ApiResponse<PesquisaIntencaoVotoDetalhe>> {
  try {
    const endpoint = `${MODULE_PATH}/pesquisas`;
    const requestBody = payload instanceof FormData ? payload : normalizePesquisaPayload(payload);
    console.log("[intencao-voto][service][create] request", {
      endpoint,
      body: summarizePesquisaRequestForLog(requestBody),
    });

    const { status, data } = await privateRequestWithMeta<unknown>(endpoint, token, {
      method: "POST",
      body: requestBody,
    });

    console.log("[intencao-voto][service][create] response", {
      endpoint,
      status,
      data,
    });

    return buildPesquisaResponse(status, data, "Pesquisa criada com sucesso.");
  } catch (error) {
    console.error("[intencao-voto][service][create] error", {
      message: readExternalApiErrorMessage(error),
      error,
    });
    return mapApiError(error, "Falha ao criar pesquisa de intenção de voto.");
  }
}

export async function listarPesquisasIntencaoDeVoto(
  token: string,
): Promise<ApiResponse<PesquisaIntencaoVoto[]>> {
  try {
    const data = await privateRequest<unknown>(`${MODULE_PATH}/pesquisas`, token, {
      method: "GET",
    });

    return {
      ok: true,
      status: 200,
      data: normalizePesquisaList(data),
      message: "Pesquisas carregadas com sucesso.",
    };
  } catch (error) {
    return mapApiError(error, "Falha ao carregar pesquisas de intenção de voto.");
  }
}

export async function buscarPesquisaIntencaoDeVotoPorId(
  token: string,
  pesquisaId: string,
): Promise<ApiResponse<PesquisaIntencaoVotoDetalhe>> {
  try {
    const data = await privateRequest<unknown>(`${MODULE_PATH}/pesquisas/${encodeURIComponent(pesquisaId)}`, token, {
      method: "GET",
    });

    return {
      ok: true,
      status: 200,
      data: normalizePesquisa(data, true),
      message: "Pesquisa carregada.",
    };
  } catch (error) {
    return mapApiError(error, "Falha ao carregar pesquisa de intenção de voto.");
  }
}

export async function atualizarPesquisaIntencaoDeVoto(
  token: string,
  pesquisaId: string,
  payload: AtualizarPesquisaIntencaoVotoPayload | FormData,
): Promise<ApiResponse<PesquisaIntencaoVotoDetalhe>> {
  try {
    const endpoint = `${MODULE_PATH}/pesquisas/${encodeURIComponent(pesquisaId)}`;
    const requestBody = payload instanceof FormData ? payload : normalizePesquisaPayload(payload);
    console.log("[intencao-voto][service][edit] request", {
      endpoint,
      pesquisaId,
      body: summarizePesquisaRequestForLog(requestBody),
    });

    const { status, data } = await privateRequestWithMeta<unknown>(
      endpoint,
      token,
      {
        method: "PUT",
        body: requestBody,
      },
    );

    console.log("[intencao-voto][service][edit] response", {
      endpoint,
      pesquisaId,
      status,
      data,
    });

    return buildPesquisaResponse(status, data, "Pesquisa atualizada com sucesso.");
  } catch (error) {
    console.error("[intencao-voto][service][edit] error", {
      pesquisaId,
      message: readExternalApiErrorMessage(error),
      error,
    });
    return mapApiError(error, "Falha ao atualizar pesquisa de intenção de voto.");
  }
}

export async function deletarPesquisaIntencaoDeVoto(
  token: string,
  pesquisaId: string,
): Promise<ApiResponse<{ message?: string }>> {
  try {
    await privateRequest<unknown>(`${MODULE_PATH}/pesquisas/${encodeURIComponent(pesquisaId)}`, token, {
      method: "DELETE",
    });

    return {
      ok: true,
      status: 200,
      data: { message: "Pesquisa removida." },
      message: "Pesquisa removida com sucesso.",
    };
  } catch (error) {
    return mapApiError(error, "Falha ao excluir pesquisa de intenção de voto.");
  }
}

export async function atualizarCacheIntencaoDeVoto(
  token: string,
): Promise<ApiResponse<JsonRecord>> {
  try {
    const data = await privateRequest<JsonRecord>(`${MODULE_PATH}/pesquisas-intencao-voto/atualizar-cache`, token, {
      method: "POST",
    });

    return {
      ok: true,
      status: 200,
      data,
      message: "Cache atualizado com sucesso.",
    };
  } catch (error) {
    return mapApiError(error, "Falha ao atualizar cache de intenção de voto.");
  }
}

export async function buscarPesquisaIntencaoDeVotoPublica(
  pesquisaId: string,
): Promise<ApiResponse<PesquisaIntencaoVotoDetalhe>> {
  try {
    const data = await externalApiRequest<unknown>(`${MODULE_PATH}/pesquisa/${encodeURIComponent(pesquisaId)}`, {
      method: "GET",
    });

    return {
      ok: true,
      status: 200,
      data: normalizePesquisa(data, false),
      message: "Pesquisa pública carregada.",
    };
  } catch (error) {
    return mapApiError(error, "Falha ao carregar pesquisa pública.");
  }
}

export async function buscarStatusFilaIntencaoDeVoto(
  token: string,
): Promise<ApiResponse<StatusFilaIntencaoVoto>> {
  try {
    const data = await privateRequest<StatusFilaIntencaoVoto>(`${MODULE_PATH}/fila/status`, token, {
      method: "GET",
    });

    return {
      ok: true,
      status: 200,
      data,
      message: "Status da fila carregado.",
    };
  } catch (error) {
    return mapApiError(error, "Falha ao consultar fila de intenção de voto.");
  }
}

function normalizeVotoPayloadPrivado(payload: PayloadRegistrarVotoPrivado) {
  return {
    estado: payload.estado.trim(),
    cidade: payload.cidade.trim(),
    bairro: payload.bairro.trim(),
    idade: payload.idade,
    telefone: payload.telefone.trim(),
    participanteId: payload.participanteId,
    candidatoId: payload.candidatoId,
    pesquisaId: payload.pesquisaId,
    canal: payload.canal as CanalVoto,
  };
}

function normalizeVotoPayloadPublico(payload: PayloadRegistrarVotoPublico) {
  return {
    telefone: payload.telefone.trim(),
    nome: payload.nome?.trim() || undefined,
    email: payload.email?.trim() || undefined,
    estado: payload.estado.trim(),
    cidade: payload.cidade.trim(),
    bairro: payload.bairro.trim(),
    idade: payload.idade,
    candidatoId: payload.candidatoId,
    canal: payload.canal as CanalVoto,
  };
}

function buildVoteErrorMessage(status: number, message: string | undefined, isPublic = false) {
  const lower = message?.toLowerCase() || "";
  if (
    status === 400 &&
    (lower.includes("já votou") ||
      lower.includes("ja votou") ||
      lower.includes("já respondeu") ||
      lower.includes("ja respondeu") ||
      lower.includes("uma vez por pesquisa"))
  ) {
    return "Este participante já votou nesta pesquisa. Um participante só pode votar uma vez por pesquisa.";
  }
  if (status === 403) {
    return "Este participante já votou nesta pesquisa.";
  }
  if (status === 404 && isPublic) {
    return "Participante não cadastrado. Cadastre-se antes de votar.";
  }
  if (status === 404) {
    return "Participante não encontrado.";
  }
  return message || "Falha ao registrar voto.";
}

export async function registrarVotoIntencaoDeVoto(
  token: string,
  payload: PayloadRegistrarVotoPrivado,
): Promise<ApiResponse<VotoRegistrado>> {
  try {
    const { status, data } = await privateRequestWithMeta<unknown>(`${MODULE_PATH}/votos`, token, {
      method: "POST",
      body: normalizeVotoPayloadPrivado(payload),
    });

    return {
      ok: true,
      status,
      data: normalizeVotoRegistrado(data),
      message: status === 202 ? "Voto enfileirado para processamento." : "Voto registrado com sucesso.",
    };
  } catch (error) {
    const response = mapApiError<VotoRegistrado>(error, "Falha ao registrar voto.");
    return { ...response, message: buildVoteErrorMessage(response.status, response.message, false) };
  }
}

export async function registrarVotoIntencaoDeVotoAlias(
  token: string,
  payload: PayloadRegistrarVotoPrivado,
): Promise<ApiResponse<VotoRegistrado>> {
  try {
    const { status, data } = await privateRequestWithMeta<unknown>(`${MODULE_PATH}/registrar-voto`, token, {
      method: "POST",
      body: normalizeVotoPayloadPrivado(payload),
    });

    return {
      ok: true,
      status,
      data: normalizeVotoRegistrado(data),
      message: status === 202 ? "Voto enfileirado para processamento." : "Voto registrado com sucesso.",
    };
  } catch (error) {
    const response = mapApiError<VotoRegistrado>(error, "Falha ao registrar voto.");
    return { ...response, message: buildVoteErrorMessage(response.status, response.message, false) };
  }
}

export async function registrarVotoIntencaoDeVotoPublico(
  pesquisaId: string,
  payload: PayloadRegistrarVotoPublico,
): Promise<ApiResponse<VotoRegistrado>> {
  try {
    const { status, data } = await externalApiRequestWithMeta<unknown>(
      `${MODULE_PATH}/votos/publico/${encodeURIComponent(pesquisaId)}`,
      {
        method: "POST",
        body: normalizeVotoPayloadPublico(payload),
      },
    );

    return {
      ok: true,
      status,
      data: normalizeVotoRegistrado(data),
      message: status === 202 ? "Voto enfileirado para processamento." : "Voto registrado com sucesso.",
    };
  } catch (error) {
    const response = mapApiError<VotoRegistrado>(error, "Falha ao registrar voto público.");
    return { ...response, message: buildVoteErrorMessage(response.status, response.message, true) };
  }
}

export async function registrarVotoIntencaoDeVotoPublicoAlias(
  pesquisaId: string,
  payload: PayloadRegistrarVotoPublico,
): Promise<ApiResponse<VotoRegistrado>> {
  try {
    const { status, data } = await externalApiRequestWithMeta<unknown>(
      `${MODULE_PATH}/registrar-voto/${encodeURIComponent(pesquisaId)}`,
      {
        method: "POST",
        body: normalizeVotoPayloadPublico(payload),
      },
    );

    return {
      ok: true,
      status,
      data: normalizeVotoRegistrado(data),
      message: status === 202 ? "Voto enfileirado para processamento." : "Voto registrado com sucesso.",
    };
  } catch (error) {
    const response = mapApiError<VotoRegistrado>(error, "Falha ao registrar voto público.");
    return { ...response, message: buildVoteErrorMessage(response.status, response.message, true) };
  }
}

export async function listarVotosIntencaoDeVoto(
  token: string,
  filters: PesquisaFilters = {},
): Promise<ApiResponse<VotoGeolocalizadoIntencaoVoto[]>> {
  try {
    const data = await privateRequest<unknown>(`${MODULE_PATH}/votos`, token, {
      method: "GET",
      query: filters,
    });

    const list = Array.isArray(unwrapPayload<unknown>(data)) ? (unwrapPayload<unknown[]>(data) as unknown[]) : [];
    return {
      ok: true,
      status: 200,
      data: list.map((item, index) => normalizeVotoGeolocalizado(item, index)),
      message: "Votos carregados com sucesso.",
    };
  } catch (error) {
    return mapApiError(error, "Falha ao carregar votos da pesquisa.");
  }
}

export async function filtrarVotosIntencaoDeVoto(
  token: string,
  filters: PesquisaFilters = {},
): Promise<ApiResponse<VotoGeolocalizadoIntencaoVoto[]>> {
  try {
    const data = await privateRequest<unknown>(`${MODULE_PATH}/filtrar-votos`, token, {
      method: "GET",
      query: filters,
    });

    const list = Array.isArray(unwrapPayload<unknown>(data)) ? (unwrapPayload<unknown[]>(data) as unknown[]) : [];
    return {
      ok: true,
      status: 200,
      data: list.map((item, index) => normalizeVotoGeolocalizado(item, index)),
      message: "Filtro aplicado com sucesso.",
    };
  } catch (error) {
    return mapApiError(error, "Falha ao filtrar votos da pesquisa.");
  }
}

export async function verificarParticipacaoIntencaoDeVoto(
  token: string,
  payload: { pesquisaId: string; participanteId: string; telefone?: string },
): Promise<ApiResponse<{ jaVotou: boolean }>> {
  try {
    const votos = await listarVotosIntencaoDeVoto(token, {
      pesquisaId: payload.pesquisaId,
      participanteId: payload.participanteId,
      telefone: payload.telefone,
      limit: 5,
    });

    if (!votos.ok) {
      return {
        ok: false,
        status: votos.status,
        data: null,
        message: votos.message || "Falha ao verificar participação.",
      };
    }

    const telefoneNormalizado = payload.telefone?.replace(/\D/g, "") || "";
    const jaVotou = Boolean(
      votos.data?.some((item) => {
        const participanteMatch = item.participante?.id === payload.participanteId;
        const contatoVoto = (item.participante?.contatoOpcional || "").replace(/\D/g, "");
        const telefoneMatch = Boolean(telefoneNormalizado) && Boolean(contatoVoto) && telefoneNormalizado === contatoVoto;
        return participanteMatch || telefoneMatch;
      }),
    );

    return {
      ok: true,
      status: 200,
      data: { jaVotou },
      message: jaVotou ? "Participante já votou nesta pesquisa." : "Participante apto para responder.",
    };
  } catch (error) {
    return mapApiError(error, "Falha ao verificar participação.");
  }
}

export async function buscarResultadosIntencaoDeVoto(
  token: string,
  pesquisaId: string,
): Promise<ApiResponse<ResultadoIntencaoVoto>> {
  try {
    const endpoint = `${MODULE_PATH}/resultados/${encodeURIComponent(pesquisaId)}`;
    console.log("[intencao-voto] buscando resultados da pesquisa", {
      endpoint,
      pesquisaId,
      baseUrl: getExternalApiConfig().baseUrl,
    });

    const data = await privateRequest<unknown>(endpoint, token, {
      method: "GET",
    });

    console.log("[intencao-voto] payload bruto de resultados", {
      pesquisaId,
      endpoint,
      data,
    });

    const normalized = normalizeResultado(data);

    console.log("[intencao-voto] resultados normalizados", {
      pesquisaId,
      endpoint,
      totalVotos: normalized.totalVotos,
      ranking: normalized.ranking,
      votosPorCanal: normalized.votosPorCanal,
      votosGeolocalizadosCount: normalized.votosGeolocalizados.length,
    });

    return {
      ok: true,
      status: 200,
      data: normalized,
      message: "Resultados carregados com sucesso.",
    };
  } catch (error) {
    console.error("[intencao-voto] erro ao buscar resultados da pesquisa", {
      pesquisaId,
      message: readExternalApiErrorMessage(error),
      error,
    });
    return mapApiError(error, "Falha ao carregar resultados da pesquisa.");
  }
}

export async function buscarParticipanteIntencaoDeVotoPorContato(
  token: string,
  contato: string,
  pesquisaId?: string,
): Promise<ApiResponse<unknown>> {
  try {
    const data = await privateRequest<unknown>(`${MODULE_PATH}/buscar-por-contato`, token, {
      method: "GET",
      query: { contato, pesquisaId: pesquisaId?.trim() || undefined },
    });

    return {
      ok: true,
      status: 200,
      data,
      message: "Participante encontrado.",
    };
  } catch (error) {
    const message = readExternalApiErrorMessage(error);
    const status =
      error && typeof error === "object" && "status" in error
        ? ((error as { status: unknown }).status as number)
        : 500;

    if (status === 404) {
      return { ok: false, status: 404, data: null, message: "Participante não encontrado." };
    }

    if (status === 400 && message) {
      const lower = message.toLowerCase();
      if (
        lower.includes("já votou") ||
        lower.includes("ja votou") ||
        lower.includes("já respondeu") ||
        lower.includes("ja respondeu") ||
        lower.includes("duplicad")
      ) {
        return {
          ok: false,
          status: 409,
          data: null,
          message: "Este participante já respondeu esta pesquisa.",
        };
      }
    }

    if (status === 403) {
      return {
        ok: false,
        status: 409,
        data: null,
        message: "Este participante já votou nesta pesquisa.",
      };
    }

    return {
      ok: false,
      status,
      data: null,
      message: message || "Falha ao consultar participante por contato.",
    };
  }
}

export async function buscarParticipanteIntencaoDeVotoPorTelefone(
  telefone: string,
): Promise<ApiResponse<ParticipanteIntencaoVoto>> {
  try {
    const data = await externalApiRequest<unknown>(`/participantes/telefone/${encodeURIComponent(telefone)}`, {
      method: "GET",
    });

    return {
      ok: true,
      status: 200,
      data: normalizeParticipante(data),
      message: "Participante encontrado.",
    };
  } catch (error) {
    return mapApiError(error, "Falha ao consultar participante por telefone.");
  }
}

export async function criarParticipanteIntencaoDeVoto(
  token: string,
  payload: {
    nome: string;
    email?: string;
    contatoOpcional: string;
  },
): Promise<ApiResponse<ParticipanteIntencaoVoto>> {
  try {
    const data = await privateRequest<unknown>("/participantes", token, {
      method: "POST",
      body: payload,
    });

    return {
      ok: true,
      status: 201,
      data: normalizeParticipante(data),
      message: "Participante criado com sucesso.",
    };
  } catch (error) {
    return mapApiError(error, "Falha ao criar participante.");
  }
}
