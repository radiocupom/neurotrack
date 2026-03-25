import { externalApiRequest, externalApiRequestWithMeta } from "@/service/api";

export type SensoQuestionario = {
  id: string;
  nome?: string;
  titulo?: string;
  urlPublica?: string;
};

export type SensoCampanha = {
  id: string;
  nome?: string;
  descricao?: string;
  questionarioId?: string;
  urlPublica?: string;
  ativo?: boolean;
  isAtivo?: boolean;
  status?: string;
  questionario?: {
    id?: string;
    nome?: string;
    titulo?: string;
    urlPublica?: string;
  };
};

export type CriarSensoCampanhaPayload = {
  nome: string;
  descricao?: string;
  questionarioId: string;
};

export type AtualizarSensoCampanhaPayload = {
  ativa: boolean;
  nome?: string;
  descricao?: string;
};

export type RespostaSenso = {
  perguntaId: string;
  opcaoId: string;
};

export type ResponderSensoPayload = {
  participanteId: string;
  questionarioId: string;
  campanhaId: string;
  estado: string;
  cidade: string;
  bairro: string;
  respostas: RespostaSenso[];
};

export type PrecheckEtapaAtual = "SENSO_POPULACIONAL" | "BIGFIVE" | "JORNADA_CONCLUIDA";

export type PrecheckJornadaPublicaSenso = {
  participanteId?: string;
  campanha?: {
    id?: string;
    nome?: string;
    ativa?: boolean;
  };
  questionario?: {
    id?: string;
    slug?: string;
    titulo?: string;
    urlPublica?: string;
  };
  status?: {
    etapaAtual?: PrecheckEtapaAtual;
    sensoRespondido?: boolean;
    bigfiveRespondido?: boolean;
    podeResponderSenso?: boolean;
    podeResponderBigFive?: boolean;
    jornadaConcluida?: boolean;
  };
  [key: string]: unknown;
};

export type ResponderSensoPublicoPayload = {
  telefone: string;
  nome?: string;
  email?: string;
  questionarioId: string;
  campanhaId: string;
  estado: string;
  cidade: string;
  bairro: string;
  canal?: "WHATSAPP" | "TELEFONE" | "PRESENCIAL" | "OUTRO";
  idade?: number;
  respostas: RespostaSenso[];
};

export function obterQuestionarioBaseSensoFromExternalApi() {
  return externalApiRequest<Record<string, unknown>>("/senso-populacional/questionario", {
    method: "GET",
  });
}

export function precheckJornadaPublicaSensoFromExternalApi({
  campanhaId,
  telefone,
  participanteId,
}: {
  campanhaId: string;
  telefone?: string;
  participanteId?: string;
}) {
  return externalApiRequest<PrecheckJornadaPublicaSenso>(
    "/senso-populacional/precheck-jornada-publico",
    {
      method: "GET",
      query: { campanhaId, telefone, participanteId },
    },
  );
}

export function listarQuestionariosSensoFromExternalApi(token: string) {
  return externalApiRequest<SensoQuestionario[]>("/senso-populacional/questionarios", {
    method: "GET",
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function listarCampanhasSensoFromExternalApi(token: string) {
  return externalApiRequest<SensoCampanha[]>("/senso-populacional/campanhas", {
    method: "GET",
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function criarCampanhaSensoFromExternalApi(token: string, payload: CriarSensoCampanhaPayload) {
  return externalApiRequest<SensoCampanha>("/senso-populacional/campanhas", {
    method: "POST",
    body: payload,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function atualizarCampanhaSensoFromExternalApi(
  token: string,
  campanhaId: string,
  payload: AtualizarSensoCampanhaPayload,
) {
  return externalApiRequest<SensoCampanha>(`/senso-populacional/campanhas/${encodeURIComponent(campanhaId)}`, {
    method: "PUT",
    body: payload,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function responderSensoFromExternalApi(token: string, payload: ResponderSensoPayload) {
  return externalApiRequestWithMeta<unknown>("/senso-populacional/responder", {
    method: "POST",
    body: payload,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function responderSensoPublicoFromExternalApi(payload: ResponderSensoPublicoPayload) {
  return externalApiRequestWithMeta<Record<string, unknown>>("/senso-populacional/responder-publico", {
    method: "POST",
    body: payload,
  });
}
