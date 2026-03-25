export const SELECT_CAMPAIGN_MESSAGE = "Selecione uma campanha valida antes de confirmar o participante.";
export const CAMPAIGNS_PERMISSION_MESSAGE =
  "Sessao sem permissao para carregar campanhas. Verifique autenticacao e token privado.";
export const INVALID_CAMPAIGN_MESSAGE =
  "Campanha nao encontrada ou inativa. Selecione uma campanha ativa.";
export const PARTICIPANTE_NOT_FOUND_MESSAGE =
  "Participante nao cadastrado. Cadastre-se antes de iniciar a pesquisa.";

export type WorkflowCampanha = {
  id: string;
  nome: string;
  descricao?: string;
  questionarioId: string;
  urlPublica?: string;
  ativo: boolean;
};

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readQuestionarioId(item: Record<string, unknown>) {
  if (typeof item.questionarioId === "string") {
    return item.questionarioId.trim();
  }

  const questionario = readObject(item.questionario);

  if (questionario && typeof questionario.id === "string") {
    return questionario.id.trim();
  }

  return "";
}

function readPublicUrl(item: Record<string, unknown>) {
  const directCandidates = [item.urlPublica, item.urlPesquisa, item.publicUrl, item.linkPublico];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  const questionario = readObject(item.questionario);
  if (!questionario) {
    return undefined;
  }

  const nestedCandidates = [
    questionario.urlPublica,
    questionario.urlPesquisa,
    questionario.publicUrl,
    questionario.linkPublico,
  ];

  for (const candidate of nestedCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return undefined;
}

function readActiveState(item: Record<string, unknown>) {
  if (typeof item.ativo === "boolean") {
    return item.ativo;
  }

  if (typeof item.isAtivo === "boolean") {
    return item.isAtivo;
  }

  const status = typeof item.status === "string" ? item.status.trim().toLowerCase() : "";
  const situacao = typeof item.situacao === "string" ? item.situacao.trim().toLowerCase() : "";
  const currentState = status || situacao;

  if (!currentState) {
    return true;
  }

  if (["ativa", "ativo", "active", "enabled", "habilitada"].includes(currentState)) {
    return true;
  }

  if (["inativa", "inativo", "inactive", "disabled", "desabilitada"].includes(currentState)) {
    return false;
  }

  return true;
}

export function normalizeCampanha(payload: unknown): WorkflowCampanha | null {
  const item = readObject(payload);

  if (!item || typeof item.id !== "string") {
    return null;
  }

  const id = item.id.trim();
  const questionarioId = readQuestionarioId(item);

  if (!isValidUuid(id) || !isValidUuid(questionarioId)) {
    return null;
  }

  return {
    id,
    nome:
      typeof item.nome === "string" && item.nome.trim()
        ? item.nome.trim()
        : typeof item.descricao === "string" && item.descricao.trim()
          ? item.descricao.trim()
          : "Campanha sem nome",
    descricao: typeof item.descricao === "string" ? item.descricao.trim() : undefined,
    questionarioId,
    urlPublica: readPublicUrl(item),
    ativo: readActiveState(item),
  };
}

export function normalizeCampanhas(payload: unknown) {
  const source = Array.isArray(payload)
    ? payload
    : readObject(payload)?.data && Array.isArray(readObject(payload)?.data)
      ? (readObject(payload)?.data as unknown[])
      : readObject(payload)?.items && Array.isArray(readObject(payload)?.items)
        ? (readObject(payload)?.items as unknown[])
        : readObject(payload)?.resultado && Array.isArray(readObject(payload)?.resultado)
          ? (readObject(payload)?.resultado as unknown[])
          : [];

  return source
    .map(normalizeCampanha)
    .filter((item): item is WorkflowCampanha => item != null);
}

export function mapCampanhasLoadError(status: number, fallback: string) {
  if (status === 401 || status === 403) {
    return CAMPAIGNS_PERMISSION_MESSAGE;
  }

  return fallback;
}
