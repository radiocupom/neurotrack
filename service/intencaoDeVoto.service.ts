import { externalApiRequest } from "@/service/api";

type AuthorizedRequest = {
  token: string;
};

type PesquisaIdRequest = AuthorizedRequest & {
  pesquisaId: string;
};

type JsonRecord = Record<string, unknown>;

type PesquisaFilters = {
  pesquisaId?: string;
  candidatoId?: string;
  idadeMin?: number;
  idadeMax?: number;
  canal?: string;
};

function privateRequest<T>(path: string, token: string, options: Parameters<typeof externalApiRequest<T>>[1] = {}) {
  return externalApiRequest<T>(path, {
    ...options,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function criarPesquisaIntencaoDeVoto(
  token: string,
  payload: JsonRecord | FormData,
) {
  return privateRequest<JsonRecord>("/intencao-voto/pesquisas", token, {
    method: "POST",
    body: payload,
  });
}

export function listarPesquisasIntencaoDeVoto({ token }: AuthorizedRequest) {
  return privateRequest<JsonRecord[]>("/intencao-voto/pesquisas", token, {
    method: "GET",
  });
}

export function buscarPesquisaIntencaoDeVotoPorId({ token, pesquisaId }: PesquisaIdRequest) {
  return privateRequest<JsonRecord>(`/intencao-voto/pesquisas/${pesquisaId}`, token, {
    method: "GET",
  });
}

export function atualizarPesquisaIntencaoDeVoto(
  { token, pesquisaId }: PesquisaIdRequest,
  payload: JsonRecord | FormData,
) {
  return privateRequest<JsonRecord>(`/intencao-voto/pesquisas/${pesquisaId}`, token, {
    method: "PUT",
    body: payload,
  });
}

export function deletarPesquisaIntencaoDeVoto({ token, pesquisaId }: PesquisaIdRequest) {
  return privateRequest<JsonRecord>(`/intencao-voto/pesquisas/${pesquisaId}`, token, {
    method: "DELETE",
  });
}

export function atualizarCacheIntencaoDeVoto({ token }: AuthorizedRequest) {
  return privateRequest<JsonRecord>("/intencao-voto/pesquisas-intencao-voto/atualizar-cache", token, {
    method: "POST",
  });
}

export function buscarPesquisaIntencaoDeVotoPublica(pesquisaId: string) {
  return externalApiRequest<JsonRecord>(`/intencao-voto/pesquisa/${pesquisaId}`, {
    method: "GET",
  });
}

export function buscarStatusFilaIntencaoDeVoto({ token }: AuthorizedRequest) {
  return privateRequest<JsonRecord>("/intencao-voto/fila/status", token, {
    method: "GET",
  });
}

export function registrarVotoIntencaoDeVoto(token: string, payload: JsonRecord) {
  return privateRequest<JsonRecord>("/intencao-voto/votos", token, {
    method: "POST",
    body: payload,
  });
}

export function registrarVotoIntencaoDeVotoAlias(token: string, payload: JsonRecord) {
  return privateRequest<JsonRecord>("/intencao-voto/registrar-voto", token, {
    method: "POST",
    body: payload,
  });
}

export function registrarVotoIntencaoDeVotoPublico(pesquisaId: string, payload: JsonRecord) {
  return externalApiRequest<JsonRecord>(`/intencao-voto/votos/publico/${pesquisaId}`, {
    method: "POST",
    body: payload,
  });
}

export function registrarVotoIntencaoDeVotoPublicoAlias(pesquisaId: string, payload: JsonRecord) {
  return externalApiRequest<JsonRecord>(`/intencao-voto/registrar-voto/${pesquisaId}`, {
    method: "POST",
    body: payload,
  });
}

export function listarVotosIntencaoDeVoto(token: string, filters: PesquisaFilters = {}) {
  return privateRequest<JsonRecord[]>("/intencao-voto/votos", token, {
    method: "GET",
    query: filters,
  });
}

export function filtrarVotosIntencaoDeVoto(token: string, filters: PesquisaFilters = {}) {
  return privateRequest<JsonRecord[]>("/intencao-voto/filtrar-votos", token, {
    method: "GET",
    query: filters,
  });
}

export function buscarResultadosIntencaoDeVoto({ token, pesquisaId }: PesquisaIdRequest) {
  return privateRequest<JsonRecord>(`/intencao-voto/resultados/${pesquisaId}`, token, {
    method: "GET",
  });
}
