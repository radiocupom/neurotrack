/**
 * Tipos para Pesquisa de Opinião
 * Estruturas compartilhadas entre fluxos privado e público
 */

// ============================================================================
// PARTICIPANTE
// ============================================================================

export type Participante = {
  id: string;
  participanteId?: string; // Alguns endpoints retornam participanteId
  nome: string;
  email?: string | null;
  contatoOpcional?: string | null;
  telefone?: string | null;
  criadoEm?: string;
};

// Normalizado para uso consistente no front
export type ParticipanteNormalizado = {
  id: string;
  nome: string;
  email?: string | null;
  contato?: string | null; // telefone ou contatoOpcional
};

// ============================================================================
// PESQUISA
// ============================================================================

export type OpcaoResposta = {
  id: string;
  texto: string;
  ordem?: number;
};

export type Pergunta = {
  id: string;
  texto: string;
  tipo?: "multipla" | "unica" | "aberta"; // padrão: multipla
  ordem?: number;
  obrigatoria?: boolean;
  opcoes: OpcaoResposta[];
};

export type PesquisaOpiniao = {
  id: string;
  titulo: string;
  descricao?: string | null;
  ativo?: boolean;
  urlPublica?: string | null;
  criadoEm?: string;
  perguntas: Pergunta[];
};

export type PesquisaDetalhe = PesquisaOpiniao;

export type PesquisaPerguntaInput = {
  texto: string;
  ordem?: number;
  obrigatoria?: boolean;
  opcoes: Array<{
    texto: string;
    ordem?: number;
  }>;
};

export type CriarPesquisaOpiniaoPayload = {
  titulo: string;
  descricao?: string;
  criadoPorId: string;
  perguntas: {
    create: PesquisaPerguntaInput[];
  };
};

export type AtualizarPesquisaOpiniaoPayload = {
  titulo?: string;
  descricao?: string;
  ativo?: boolean;
  perguntas?: {
    create?: PesquisaPerguntaInput[];
  };
};

// ============================================================================
// RESPOSTAS
// ============================================================================

export type RespostaUsuario = {
  perguntaId: string;
  opcaoRespostaId: string;
};

export type PayloadResponderPrivado = {
  participanteId: string;
  pesquisaId: string;
  estado: string;
  cidade: string;
  bairro: string;
  canal?: "WHATSAPP" | "TELEFONE" | "PRESENCIAL" | "OUTRO";
  idade?: number;
  telefone?: string;
  latitude?: number | null;
  longitude?: number | null;
  respostas: RespostaUsuario[];
};

export type PayloadResponderPublico = {
  telefone: string;
  nome?: string;
  email?: string;
  estado: string;
  cidade: string;
  bairro: string;
  canal?: "WHATSAPP" | "TELEFONE" | "PRESENCIAL" | "OUTRO";
  idade?: number;
  pesquisaId?: string; // Pode vir ou não dependendo da rota
  respostas: RespostaUsuario[];
};

// ============================================================================
// RESPOSTAS DA API
// ============================================================================

export type ApiResponse<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
};

export enum RespostaStatus {
  SUCESSO = 201,
  ENFILEIRADA = 202,
  ERRO_VALIDACAO = 400,
  NAO_AUTORIZADO = 401,
  PROIBIDO = 403,
  NAO_ENCONTRADO = 404,
  CONFLITO = 409,
  ERRO_INTERNO = 500,
}

export type RespostaRegistrada = {
  id: string;
  pesquisaId: string;
  participanteId: string;
  respondidoEm: string;
};

export type RespostaBloqueada = {
  motivo: "duplicidade_ip" | "participante_ja_respondeu" | string;
  mensagem: string;
};

// ============================================================================
// ESTADOS DE CARREGAMENTO
// ============================================================================

export type LoadState = "idle" | "validating" | "submitting" | "queued" | "success" | "error";

export type ContextoResponder = {
  state: LoadState;
  error: string | null;
  isProcessing: boolean; // submitting || queued
};

// ============================================================================
// FILA
// ============================================================================

export type StatusFila = {
  total: number;
  pendentes: number;
  processadas: number;
  falhas: number;
};
