import { externalApiRequest } from "@/service/api";

export type Participante = {
  id: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  contatoOpcional?: string | null;
  criadoEm?: string | null;
};

export type CanalResposta = "WHATSAPP" | "TELEFONE" | "PRESENCIAL" | "OUTRO" | null;

export type CampanhaResumo = {
  id: string;
  nome: string;
};

export type PesquisaOpiniaoResumo = {
  id: string;
  titulo: string;
  descricao: string | null;
  ativo: boolean;
  criadoEm: string;
  criadoPorId: string;
};

export type PerguntaOpiniao = {
  id: string;
  texto: string;
  ordem: number;
  pesquisaId: string;
};

export type OpcaoRespostaOpiniao = {
  id: string;
  texto: string;
  ordem: number;
  perguntaId: string;
};

export type RespostaOpiniaoMarcada = {
  id: string;
  respostaParticipanteId: string;
  perguntaId: string;
  opcaoRespostaId: string;
  pergunta: PerguntaOpiniao;
  opcaoResposta: OpcaoRespostaOpiniao;
};

export type RespostaPesquisaOpiniao = {
  id: string;
  respondidoEm: string;
  participanteId: string;
  pesquisaId: string;
  entrevistadorId: string | null;
  ip: string | null;
  canal: CanalResposta;
  idade: number;
  telefone: string | null;
  estado: string | null;
  cidade: string | null;
  bairro: string | null;
  latitude: number;
  longitude: number;
  pesquisa: PesquisaOpiniaoResumo;
  respostas: RespostaOpiniaoMarcada[];
};

export type QuestionarioSensoResumo = {
  id: string;
  slug: string;
  titulo: string;
  descricao: string | null;
};

export type PerguntaSenso = {
  id: string;
  codigo: string;
  texto: string;
  ordem: number;
  obrigatoria: boolean;
  questionarioId: string;
};

export type OpcaoSenso = {
  id: string;
  codigo: string;
  texto: string;
  ordem: number;
  perguntaId: string;
};

export type RespostaSensoMarcada = {
  id: string;
  respostaId: string;
  perguntaId: string;
  opcaoId: string;
  pergunta: PerguntaSenso;
  opcao: OpcaoSenso;
};

export type RespostaSenso = {
  id: string;
  respondidoEm: string;
  participanteId: string;
  questionarioId: string;
  campanhaId: string | null;
  entrevistadorId: string | null;
  ip: string | null;
  canal: CanalResposta;
  idade: number;
  telefone: string | null;
  estado: string | null;
  cidade: string | null;
  bairro: string | null;
  latitude: number;
  longitude: number;
  campanha: CampanhaResumo | null;
  questionario: QuestionarioSensoResumo;
  respostas: RespostaSensoMarcada[];
};

export type RespostaBigFive = {
  id: string;
  respondidoEm: string;
  participanteId: string;
  campanhaId: string | null;
  entrevistadorId: string | null;
  abertura1: number;
  abertura2: number;
  abertura3: number;
  consc1: number;
  consc2: number;
  consc3: number;
  extro1: number;
  extro2: number;
  extro3: number;
  amavel1: number;
  amavel2: number;
  amavel3: number;
  neuro1: number;
  neuro2: number;
  neuro3: number;
  interpretacao: string;
  classificacao: string;
  ip: string | null;
  canal: CanalResposta;
  idade: number;
  telefone: string | null;
  estado: string | null;
  cidade: string | null;
  bairro: string | null;
  latitude: number;
  longitude: number;
  campanha: CampanhaResumo | null;
};

export type CandidatoResumo = {
  id: string;
  nome: string;
  partido: string;
  fotoUrl: string | null;
  pesquisaId: string;
};

export type PesquisaVotoResumo = {
  id: string;
  titulo: string;
  descricao: string | null;
  ativo: boolean;
  cargo: string;
  idRegistroTSE: string | null;
  urlPesquisa: string | null;
  criadoEm: string;
  criadoPorId: string;
};

export type VotoParticipante = {
  id: string;
  estado: string;
  cidade: string;
  bairro: string;
  idade: number;
  telefone: string | null;
  latitude: number;
  longitude: number;
  ip: string | null;
  criadoEm: string;
  atualizadoEm: string;
  participanteId: string;
  entrevistadorId: string | null;
  candidatoId: string;
  pesquisaId: string;
  canal: CanalResposta;
  candidato: CandidatoResumo;
  pesquisa: PesquisaVotoResumo;
};

export type ParticipanteComPesquisas = Participante & {
  respostasBigFive?: RespostaBigFive[];
  respostasPesquisas?: RespostaPesquisaOpiniao[];
  respostasSenso?: RespostaSenso[];
  votos?: VotoParticipante[];
};

export type CriarParticipantePayload = {
  nome: string;
  email?: string;
  contatoOpcional: string;
};

export type IdentificarParticipantePayload = {
  nome: string;
  telefone: string;
  email?: string;
};

export function listarParticipantesFromExternalApi(token: string) {
  return externalApiRequest<Participante[] | { data?: Participante[]; items?: Participante[] }>(
    "/participantes",
    {
      method: "GET",
      token,
      requiresAuth: true,
      requiresPrivateToken: true,
    },
  );
}

export function identificarParticipanteFromExternalApi(payload: IdentificarParticipantePayload) {
  return externalApiRequest<Participante | { participante?: Participante }>("/participantes/identificar", {
    method: "POST",
    body: payload,
  });
}

export function buscarParticipantePorTelefoneFromExternalApi(telefone: string) {
  return externalApiRequest<Participante>(`/participantes/telefone/${encodeURIComponent(telefone)}`, {
    method: "GET",
  });
}

export function buscarParticipantePorContatoFromExternalApi(token: string, contato: string) {
  return externalApiRequest<Participante | Participante[] | { data?: Participante[]; items?: Participante[] }>(
    "/participantes/buscar-por-contato",
    {
      method: "GET",
      query: { contato },
      token,
      requiresAuth: true,
      requiresPrivateToken: true,
    },
  );
}

export function criarParticipanteFromExternalApi(token: string, payload: CriarParticipantePayload) {
  return externalApiRequest<Participante>("/participantes", {
    method: "POST",
    body: payload,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function listarParticipantesComPesquisasFromExternalApi(token: string) {
  return externalApiRequest<ParticipanteComPesquisas[]>("/participantes/com-pesquisas", {
    method: "GET",
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function obterParticipanteComPesquisasFromExternalApi(token: string, participanteId: string) {
  return externalApiRequest<ParticipanteComPesquisas>(`/participantes/com-pesquisas/${encodeURIComponent(participanteId)}`, {
    method: "GET",
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function obterParticipantePorIdFromExternalApi(token: string, participanteId: string) {
  return externalApiRequest<Participante>(`/participantes/${encodeURIComponent(participanteId)}`, {
    method: "GET",
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}
