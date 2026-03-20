import { externalApiRequest } from "@/service/api";

type DashboardQueryValue = string | string[];

type DashboardQuery = Record<string, DashboardQueryValue | undefined>;

function normalizeQuery(query?: DashboardQuery) {
  if (!query) {
    return undefined;
  }

  const next: Record<string, string | string[]> = {};

  Object.entries(query).forEach(([key, value]) => {
    if (value == null) {
      return;
    }

    if (Array.isArray(value)) {
      const items = value.map((item) => item.trim()).filter(Boolean);
      if (items.length > 0) {
        next[key] = items;
      }
      return;
    }

    const trimmed = value.trim();
    if (trimmed) {
      next[key] = trimmed;
    }
  });

  return Object.keys(next).length > 0 ? next : undefined;
}

export function listarPesquisasSensoDashboardFromExternalApi(token: string) {
  return externalApiRequest<unknown>("/dashboard/pesquisas/senso-populacional", {
    method: "GET",
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function listarPesquisasOpiniaoDashboardFromExternalApi(token: string) {
  return externalApiRequest<unknown>("/dashboard/pesquisas/opiniao", {
    method: "GET",
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function obterResumoSensoDashboardFromExternalApi(
  token: string,
  questionarioId: string,
  query?: DashboardQuery,
) {
  return externalApiRequest<unknown>(
    `/dashboard/resultado/senso-populacional/${encodeURIComponent(questionarioId)}`,
    {
      method: "GET",
      token,
      query: normalizeQuery(query),
      requiresAuth: true,
      requiresPrivateToken: true,
    },
  );
}

export function obterParticipantesSensoDashboardFromExternalApi(
  token: string,
  questionarioId: string,
  query?: DashboardQuery,
) {
  return externalApiRequest<unknown>(
    `/dashboard/resultado/senso-populacional/${encodeURIComponent(questionarioId)}/participantes`,
    {
      method: "GET",
      token,
      query: normalizeQuery(query),
      requiresAuth: true,
      requiresPrivateToken: true,
    },
  );
}

export function obterAnaliseSensoDashboardFromExternalApi(
  token: string,
  questionarioId: string,
  query?: DashboardQuery,
) {
  return externalApiRequest<unknown>(
    `/dashboard/resultado/senso-populacional/${encodeURIComponent(questionarioId)}/analise-ia`,
    {
      method: "GET",
      token,
      query: normalizeQuery(query),
      requiresAuth: true,
      requiresPrivateToken: true,
    },
  );
}

export function obterResumoBigFiveDashboardFromExternalApi(token: string, query?: DashboardQuery) {
  return externalApiRequest<unknown>("/dashboard/resultado/bigfive", {
    method: "GET",
    token,
    query: normalizeQuery(query),
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function obterResumoOpiniaoDashboardFromExternalApi(
  token: string,
  pesquisaId: string,
  query?: DashboardQuery,
) {
  return externalApiRequest<unknown>(
    `/dashboard/resultado/opiniao/${encodeURIComponent(pesquisaId)}`,
    {
      method: "GET",
      token,
      query: normalizeQuery(query),
      requiresAuth: true,
      requiresPrivateToken: true,
    },
  );
}

export function obterParticipantesOpiniaoDashboardFromExternalApi(
  token: string,
  pesquisaId: string,
  query?: DashboardQuery,
) {
  return externalApiRequest<unknown>(
    `/dashboard/resultado/opiniao/${encodeURIComponent(pesquisaId)}/participantes`,
    {
      method: "GET",
      token,
      query: normalizeQuery(query),
      requiresAuth: true,
      requiresPrivateToken: true,
    },
  );
}

export function obterAnaliseOpiniaoDashboardFromExternalApi(
  token: string,
  pesquisaId: string,
  query?: DashboardQuery,
) {
  return externalApiRequest<unknown>(
    `/dashboard/resultado/opiniao/${encodeURIComponent(pesquisaId)}/analise-ia`,
    {
      method: "GET",
      token,
      query: normalizeQuery(query),
      requiresAuth: true,
      requiresPrivateToken: true,
    },
  );
}

export function obterAnaliseBigFiveDashboardFromExternalApi(token: string, query?: DashboardQuery) {
  return externalApiRequest<unknown>("/dashboard/resultado/bigfive/analise-ia", {
    method: "GET",
    token,
    query: normalizeQuery(query),
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}
