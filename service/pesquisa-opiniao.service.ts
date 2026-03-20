/**
 * Serviço de Pesquisa de Opinião
 * Centraliza todas as chamadas de API para pesquisas
 * Usa service/api.ts como ponto de entrada (herança da arquitetura do projeto)
 */

import {
  externalApiRequest,
  readExternalApiErrorMessage,
} from "@/service/api";
import type {
  AtualizarPesquisaOpiniaoPayload,
  ApiResponse,
  CriarPesquisaOpiniaoPayload,
  Participante,
  PayloadResponderPrivado,
  PayloadResponderPublico,
  PesquisaDetalhe,
  PesquisaOpiniao,
  RespostaRegistrada,
  StatusFila,
} from "@/types/pesquisa-opiniao";

const MODULE_PATH = "/pesquisa-de-opniao";

type ContratoOpcaoCreate = {
  texto: string;
  ordem: number;
};

type ContratoPerguntaCreate = {
  texto: string;
  ordem: number;
  obrigatoria: boolean;
  opcoes: {
    create: ContratoOpcaoCreate[];
  };
};

type ContratoCriarPesquisaPayload = {
  titulo: string;
  descricao?: string;
  criadoPorId: string;
  perguntas: {
    create: ContratoPerguntaCreate[];
  };
};

type ContratoAtualizarPesquisaPayload = {
  titulo?: string;
  descricao?: string;
  ativa?: boolean;
  perguntas?: {
    create?: ContratoPerguntaCreate[];
  };
};

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function unwrapPayload<T = unknown>(value: unknown): T | null {
  const source = readObject(value);
  if (!source) {
    return (value as T) ?? null;
  }

  const candidates = [source.data, source.resultado, source.item, source.pesquisa];
  for (const candidate of candidates) {
    if (candidate != null) {
      return candidate as T;
    }
  }

  return value as T;
}

function normalizePesquisaDetalhe(value: unknown): PesquisaDetalhe | null {
  const unwrapped = unwrapPayload<Record<string, unknown>>(value);
  const source = readObject(unwrapped);
  if (!source) {
    return null;
  }

  const perguntasRaw = Array.isArray(source.perguntas) ? source.perguntas : [];
  const perguntas = perguntasRaw.map((perguntaRaw, perguntaIndex) => {
    const pergunta = readObject(perguntaRaw) ?? {};
    const tipoRaw = pergunta.tipo;
    const tipoNormalizado: "multipla" | "unica" | "aberta" | undefined =
      tipoRaw === "multipla" || tipoRaw === "unica" || tipoRaw === "aberta"
        ? tipoRaw
        : undefined;
    const opcoesRaw = Array.isArray(pergunta.opcoes) ? pergunta.opcoes : [];
    const opcoes = opcoesRaw.map((opcaoRaw, opcaoIndex) => {
      const opcao = readObject(opcaoRaw) ?? {};
      return {
        id: typeof opcao.id === "string" ? opcao.id : `opcao-${perguntaIndex}-${opcaoIndex}`,
        texto: typeof opcao.texto === "string" ? opcao.texto : "",
        ordem: typeof opcao.ordem === "number" ? opcao.ordem : opcaoIndex + 1,
      };
    });

    return {
      id: typeof pergunta.id === "string" ? pergunta.id : `pergunta-${perguntaIndex}`,
      texto: typeof pergunta.texto === "string" ? pergunta.texto : "",
      tipo: tipoNormalizado,
      ordem: typeof pergunta.ordem === "number" ? pergunta.ordem : perguntaIndex + 1,
      obrigatoria: typeof pergunta.obrigatoria === "boolean" ? pergunta.obrigatoria : true,
      opcoes,
    };
  });

  return {
    id: typeof source.id === "string" ? source.id : "",
    titulo: typeof source.titulo === "string" ? source.titulo : "Pesquisa sem titulo",
    descricao: typeof source.descricao === "string" ? source.descricao : null,
    ativa: typeof source.ativa === "boolean" ? source.ativa : true,
    criadoEm: typeof source.criadoEm === "string" ? source.criadoEm : undefined,
    perguntas,
  };
}

function normalizeListaPesquisas(value: unknown): PesquisaOpiniao[] {
  const unwrapped = unwrapPayload<unknown>(value);
  const list = Array.isArray(unwrapped) ? unwrapped : [];
  return list
    .map((item) => normalizePesquisaDetalhe(item))
    .filter((item): item is PesquisaOpiniao => item != null);
}

function normalizarPerguntasParaContrato(payloadPerguntas?: CriarPesquisaOpiniaoPayload["perguntas"] | AtualizarPesquisaOpiniaoPayload["perguntas"]) {
  if (!payloadPerguntas?.create) {
    return undefined;
  }

  const perguntasCreate = payloadPerguntas.create.map((pergunta, perguntaIndex) => {
    const opcoesCreate = pergunta.opcoes
      .filter((opcao) => Boolean(opcao.texto?.trim()))
      .map((opcao, opcaoIndex) => ({
        texto: opcao.texto.trim(),
        ordem: opcao.ordem ?? opcaoIndex + 1,
      }));

    return {
      texto: pergunta.texto.trim(),
      ordem: pergunta.ordem ?? perguntaIndex + 1,
      obrigatoria: pergunta.obrigatoria ?? true,
      opcoes: {
        create: opcoesCreate,
      },
    };
  });

  return {
    create: perguntasCreate,
  };
}

function normalizarPayloadCriacao(payload: CriarPesquisaOpiniaoPayload): ContratoCriarPesquisaPayload {
  return {
    titulo: payload.titulo.trim(),
    descricao: payload.descricao?.trim() || undefined,
    criadoPorId: payload.criadoPorId,
    perguntas: normalizarPerguntasParaContrato(payload.perguntas) ?? { create: [] },
  };
}

function normalizarPayloadAtualizacao(payload: AtualizarPesquisaOpiniaoPayload): ContratoAtualizarPesquisaPayload {
  return {
    titulo: payload.titulo?.trim() || undefined,
    descricao: payload.descricao?.trim() || undefined,
    ativa: payload.ativa,
    perguntas: normalizarPerguntasParaContrato(payload.perguntas),
  };
}

// ============================================================================
// PESQUISAS - Público e Privado
// ============================================================================

/**
 * Listar todas as pesquisas (privado - requer autenticação)
 */
export async function listarPesquisas(
  token: string,
): Promise<ApiResponse<PesquisaOpiniao[]>> {
  try {
    const data = await externalApiRequest<unknown>(MODULE_PATH, {
      method: "GET",
      token,
      requiresAuth: true,
      requiresPrivateToken: true,
    });

    const pesquisas = normalizeListaPesquisas(data);

    return {
      ok: true,
      status: 200,
      data: pesquisas,
      message: "Pesquisas carregadas com sucesso.",
    };
  } catch (error) {
    const message = readExternalApiErrorMessage(error);
    return {
      ok: false,
      status: 500,
      data: null,
      message: message || "Erro ao carregar pesquisas.",
    };
  }
}

/**
 * Obter pesquisa por ID (privado)
 */
export async function obterPesquisa(
  token: string,
  pesquisaId: string,
): Promise<ApiResponse<PesquisaDetalhe>> {
  try {
    const data = await externalApiRequest<unknown>(
      `${MODULE_PATH}/${encodeURIComponent(pesquisaId)}`,
      {
        method: "GET",
        token,
        requiresAuth: true,
        requiresPrivateToken: true,
      },
    );

    const pesquisa = normalizePesquisaDetalhe(data);

    return {
      ok: true,
      status: 200,
      data: pesquisa,
      message: "Pesquisa carregada.",
    };
  } catch (error) {
    const message = readExternalApiErrorMessage(error);
    const status = (error && typeof error === "object" && "status" in error)
      ? ((error as { status: unknown }).status as number)
      : 500;

    return {
      ok: false,
      status,
      data: null,
      message: message || "Erro ao carregar pesquisa.",
    };
  }
}

/**
 * Obter pesquisa pública (sem autenticação)
 * Usado antes de responder no fluxo público
 */
export async function obterPesquisaPublica(
  pesquisaId: string,
): Promise<ApiResponse<PesquisaDetalhe>> {
  try {
    const data = await externalApiRequest<unknown>(
      `${MODULE_PATH}/${encodeURIComponent(pesquisaId)}`,
      {
        method: "GET",
      },
    );

    const pesquisa = normalizePesquisaDetalhe(data);

    return {
      ok: true,
      status: 200,
      data: pesquisa,
      message: "Pesquisa carregada.",
    };
  } catch (error) {
    const message = readExternalApiErrorMessage(error);
    const status = (error && typeof error === "object" && "status" in error)
      ? ((error as { status: unknown }).status as number)
      : 500;

    return {
      ok: false,
      status,
      data: null,
      message: message || "Erro ao carregar pesquisa.",
    };
  }
}

export async function criarPesquisa(
  token: string,
  payload: CriarPesquisaOpiniaoPayload,
): Promise<ApiResponse<PesquisaDetalhe>> {
  try {
    const contratoPayload = normalizarPayloadCriacao(payload);
    const data = await externalApiRequest<unknown>(MODULE_PATH, {
      method: "POST",
      body: contratoPayload,
      token,
      requiresAuth: true,
      requiresPrivateToken: true,
    });

    const pesquisa = normalizePesquisaDetalhe(data);

    return {
      ok: true,
      status: 201,
      data: pesquisa,
      message: "Pesquisa criada com sucesso.",
    };
  } catch (error) {
    const message = readExternalApiErrorMessage(error);
    const status =
      error && typeof error === "object" && "status" in error
        ? ((error as { status: unknown }).status as number)
        : 500;

    return {
      ok: false,
      status,
      data: null,
      message: message || "Erro ao criar pesquisa.",
    };
  }
}

export async function atualizarPesquisa(
  token: string,
  pesquisaId: string,
  payload: AtualizarPesquisaOpiniaoPayload,
): Promise<ApiResponse<PesquisaDetalhe>> {
  try {
    const contratoPayload = normalizarPayloadAtualizacao(payload);
    const data = await externalApiRequest<unknown>(
      `${MODULE_PATH}/${encodeURIComponent(pesquisaId)}`,
      {
        method: "PUT",
        body: contratoPayload,
        token,
        requiresAuth: true,
        requiresPrivateToken: true,
      },
    );

    const pesquisa = normalizePesquisaDetalhe(data);

    return {
      ok: true,
      status: 200,
      data: pesquisa,
      message: "Pesquisa atualizada com sucesso.",
    };
  } catch (error) {
    const message = readExternalApiErrorMessage(error);
    const status =
      error && typeof error === "object" && "status" in error
        ? ((error as { status: unknown }).status as number)
        : 500;

    return {
      ok: false,
      status,
      data: null,
      message: message || "Erro ao atualizar pesquisa.",
    };
  }
}

export async function excluirPesquisa(token: string, pesquisaId: string): Promise<ApiResponse<null>> {
  try {
    await externalApiRequest<unknown>(`${MODULE_PATH}/${encodeURIComponent(pesquisaId)}`, {
      method: "DELETE",
      token,
      requiresAuth: true,
      requiresPrivateToken: true,
    });

    return {
      ok: true,
      status: 204,
      data: null,
      message: "Pesquisa excluida com sucesso.",
    };
  } catch (error) {
    const message = readExternalApiErrorMessage(error);
    const status =
      error && typeof error === "object" && "status" in error
        ? ((error as { status: unknown }).status as number)
        : 500;

    return {
      ok: false,
      status,
      data: null,
      message: message || "Erro ao excluir pesquisa.",
    };
  }
}

// ============================================================================
// PARTICIPANTES - Busca e Identificação
// ============================================================================

/**
 * Buscar participante por contato (privado)
 * Usado no fluxo entrevistador para reutilizar participante existente
 */
export async function buscarParticipantePorContato(
  token: string,
  contato: string,
): Promise<ApiResponse<Participante>> {
  try {
    const data = await externalApiRequest<Participante>(
      `${MODULE_PATH}/buscar-por-contato?contato=${encodeURIComponent(contato)}`,
      {
        method: "GET",
        token,
        requiresAuth: true,
        requiresPrivateToken: true,
      },
    );

    return {
      ok: true,
      status: 200,
      data: data || null,
      message: "Participante encontrado.",
    };
  } catch (error) {
    const message = readExternalApiErrorMessage(error);
    const status = (error && typeof error === "object" && "status" in error)
      ? ((error as { status: unknown }).status as number)
      : 500;

    // 404 é esperado se não encontrar - não é erro crítico
    if (status === 404) {
      return {
        ok: false,
        status: 404,
        data: null,
        message: "Participante não encontrado.",
      };
    }

    return {
      ok: false,
      status,
      data: null,
      message: message || "Erro ao buscar participante.",
    };
  }
}

/**
 * Identificar/criar participante (público)
 * POST /participantes/identificar na API externa - cria ou reaproveita por telefone
 */
export async function identificarParticipantePublico(payload: {
  nome: string;
  telefone: string;
  email?: string;
}): Promise<ApiResponse<Participante>> {
  try {
    const data = await externalApiRequest<Participante>(
      "/participantes/identificar",
      {
        method: "POST",
        body: payload,
      },
    );

    return {
      ok: true,
      status: 200,
      data: data || null,
      message: "Participante identificado.",
    };
  } catch (error) {
    const message = readExternalApiErrorMessage(error);
    const status = (error && typeof error === "object" && "status" in error)
      ? ((error as { status: unknown }).status as number)
      : 500;

    return {
      ok: false,
      status,
      data: null,
      message: message || "Erro ao identificar participante.",
    };
  }
}

/**
 * Criar novos participantes (privado)
 * Usado no fluxo entrevistador se não encontrou por contato
 */
export async function criarParticipante(
  token: string,
  payload: {
    nome: string;
    email?: string;
    contatoOpcional?: string;
  },
): Promise<ApiResponse<Participante>> {
  try {
    const data = await externalApiRequest<Participante>(
      "/participantes",
      {
        method: "POST",
        body: payload,
        token,
        requiresAuth: true,
        requiresPrivateToken: true,
      },
    );

    return {
      ok: true,
      status: 201,
      data: data || null,
      message: "Participante criado com sucesso.",
    };
  } catch (error) {
    const message = readExternalApiErrorMessage(error);
    const status = (error && typeof error === "object" && "status" in error)
      ? ((error as { status: unknown }).status as number)
      : 500;

    return {
      ok: false,
      status,
      data: null,
      message: message || "Erro ao criar participante.",
    };
  }
}

// ============================================================================
// RESPONDER
// ============================================================================

/**
 * Responder pesquisa (fluxo privado - entrevistador)
 * POST /pesquisa-de-opniao/responder na API externa
 * 
 * Pode retornar:
 * - 201: resposta registrada
 * - 202: enfileirada (processamento assíncrono)
 * - 400: erro de validação ou participante já respondeu
 * - 404: participante não encontrado
 */
export async function responderPesquisaPrivada(
  token: string,
  payload: PayloadResponderPrivado,
): Promise<ApiResponse<RespostaRegistrada>> {
  try {
    const data = await externalApiRequest<RespostaRegistrada>(
      `${MODULE_PATH}/responder`,
      {
        method: "POST",
        body: payload,
        token,
        requiresAuth: true,
        requiresPrivateToken: true,
      },
    );

    return {
      ok: true,
      status: 201,
      data: data || null,
      message: "Resposta registrada com sucesso.",
    };
  } catch (error) {
    const message = readExternalApiErrorMessage(error);
    const status = (error && typeof error === "object" && "status" in error)
      ? ((error as { status: unknown }).status as number)
      : 500;

    // Verificar se é 202 (enfileirada)
    if (status === 202) {
      return {
        ok: true, // Tratamos como sucesso, mas com status 202
        status: 202,
        data: null,
        message: "Resposta enfileirada para processamento. Pode levar alguns momentos.",
      };
    }

    // Mensagens específicas por erro
    let mensagemAmigavel = message;
    if (status === 400) {
      if (message && message.toLowerCase().includes("duplicad")) {
        mensagemAmigavel = "Este participante já respondeu esta pesquisa.";
      } else {
        mensagemAmigavel = "Dados inválidos. Verifique e tente novamente.";
      }
    } else if (status === 404) {
      mensagemAmigavel = "Participante não encontrado.";
    }

    return {
      ok: false,
      status,
      data: null,
      message: mensagemAmigavel,
    };
  }
}

/**
 * Responder pesquisa (fluxo público)
 * POST /pesquisa-de-opniao/:id/responder-publico na API externa
 * 
 * Pode retornar:
 * - 201: sucesso
 * - 202: enfileirada
 * - 403: bloqueio de duplicidade por IP
 * - 404: participante não cadastrado
 * - 400: validação
 * - 500: erro interno
 */
export async function responderPesquisaPublica(
  pesquisaId: string,
  payload: PayloadResponderPublico,
): Promise<ApiResponse<RespostaRegistrada>> {
  try {
    const data = await externalApiRequest<RespostaRegistrada>(
      `${MODULE_PATH}/${encodeURIComponent(pesquisaId)}/responder-publico`,
      {
        method: "POST",
        body: payload,
      },
    );

    return {
      ok: true,
      status: 201,
      data: data || null,
      message: "Resposta registrada com sucesso.",
    };
  } catch (error) {
    const message = readExternalApiErrorMessage(error);
    const status = (error && typeof error === "object" && "status" in error)
      ? ((error as { status: unknown }).status as number)
      : 500;

    // Verificar se é 202 (enfileirada)
    if (status === 202) {
      return {
        ok: true,
        status: 202,
        data: null,
        message: "Resposta enfileirada para processamento. Pode levar alguns momentos.",
      };
    }

    // Mensagens específicas
    let mensagemAmigavel = message;
    if (status === 403) {
      mensagemAmigavel = "Já existe resposta para esta pesquisa neste dispositivo/rede.";
    } else if (status === 404) {
      mensagemAmigavel = "Identifique-se antes de responder a pesquisa.";
    } else if (status === 400) {
      mensagemAmigavel = "Dados inválidos. Verifique e tente novamente.";
    }

    return {
      ok: false,
      status,
      data: null,
      message: mensagemAmigavel,
    };
  }
}

// ============================================================================
// FILA (ADMIN)
// ============================================================================

/**
 * Obter status da fila (ADMIN/SUPERADMIN)
 */
export async function obterStatusFila(
  token: string,
): Promise<ApiResponse<StatusFila>> {
  try {
    const data = await externalApiRequest<StatusFila>(
      `${MODULE_PATH}/fila/status`,
      {
        method: "GET",
        token,
        requiresAuth: true,
        requiresPrivateToken: true,
      },
    );

    return {
      ok: true,
      status: 200,
      data: data || null,
      message: "Status da fila obtido.",
    };
  } catch (error) {
    const message = readExternalApiErrorMessage(error);
    const status = (error && typeof error === "object" && "status" in error)
      ? ((error as { status: unknown }).status as number)
      : 500;

    return {
      ok: false,
      status,
      data: null,
      message: message || "Erro ao obter status da fila.",
    };
  }
}
