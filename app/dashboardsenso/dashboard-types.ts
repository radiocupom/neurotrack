import type { DashboardFilters } from "@/service/dashboard-filters";

export type DashboardQuestionarioSenso = {
  id: string;
  slug?: string;
  titulo: string;
  descricao?: string | null;
  ativo?: boolean;
  criadoEm?: string;
};

export type DashboardKpiItem = {
  chave: string;
  total: number;
};

export type DashboardSensoResumo = {
  id: string;
  titulo: string;
  descricao?: string | null;
  totalRespostasFiltradas: number;
  filtrosAplicados?: DashboardFilters;
  resultado: Array<{
    id: string;
    codigo?: string;
    texto: string;
    opcoes: Array<{
      id: string;
      codigo?: string;
      texto: string;
      total: number;
    }>;
  }>;
};

export type DashboardParticipanteSensoResposta = {
  id: string;
  respondidoEm?: string;
  estado?: string | null;
  cidade?: string | null;
  bairro?: string | null;
  ip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coordenada?: { latitude?: number | null; longitude?: number | null } | null;
  participante?: { id?: string; nome?: string | null; contatoOpcional?: string | null };
  entrevistador?: { id?: string; nome?: string | null; email?: string | null };
  respostas?: Array<{
    id?: string;
    pergunta?: { id?: string; texto?: string; codigo?: string };
    opcao?: { id?: string; texto?: string; codigo?: string };
  }>;
};

export type DashboardSensoParticipantes = {
  questionarioId: string;
  total: number;
  totalFiltrado: number;
  filtrosAplicados?: DashboardFilters;
  paginacao?: { limit: number; offset: number; temMais: boolean };
  respostas: DashboardParticipanteSensoResposta[];
};

export type DashboardIaCards = {
  classificacao?: { id?: string; titulo?: string; conteudo?: Record<string, unknown> };
  analises?: Array<{ id?: string; titulo?: string; conteudo?: string }>;
  metodos?: { id?: string; titulo?: string; conteudo?: Record<string, unknown> };
  acoes?: { id?: string; titulo?: string; itens?: string[] };
  resumoExecutivo?: { id?: string; titulo?: string; itens?: string[] };
  limitacoes?: { id?: string; titulo?: string; itens?: string[] };
};

export type DashboardAnaliseIa = {
  resumoExecutivo?: string[];
  riscosEAcoes?: string[];
  limitacoes?: string[];
  cards?: DashboardIaCards;
  fonte?: { tipo?: string; pesquisaId?: string; base?: string; modelo?: string };
  geradoEm?: string;
};

export type DashboardBigFiveResumo = {
  resumo?: {
    totalParticipantesComBigFive?: number;
    totalParticipantesComSenso?: number;
    distribuicaoClassificacao?: Record<string, number>;
    medias?: Record<string, number>;
    sensoPopulacional?: {
      distribuicaoQuestionarios?: Record<string, number>;
      topEstados?: DashboardKpiItem[];
      topCidades?: DashboardKpiItem[];
    };
  };
  filtrosAplicados?: DashboardFilters;
  participantes?: Array<{
    participante?: { id?: string; nome?: string | null; contatoOpcional?: string | null };
    coordenada?: { latitude?: number | null; longitude?: number | null } | null;
    sensoPopulacional?: {
      id?: string;
      respondidoEm?: string;
      estado?: string | null;
      cidade?: string | null;
      bairro?: string | null;
      questionario?: {
        id?: string;
        titulo?: string | null;
        slug?: string | null;
      } | null;
      respostas?: Array<{
        id?: string;
        pergunta?: {
          id?: string;
          texto?: string | null;
          codigo?: string | null;
        } | null;
        opcao?: {
          id?: string;
          texto?: string | null;
          codigo?: string | null;
        } | null;
      }>;
    };
    resultado?: {
      id?: string;
      respondidoEm?: string;
      classificacao?: string;
      interpretacao?: string;
      entrevistador?: { id?: string; nome?: string | null; email?: string | null };
    };
    metricas?: {
      abertura?: number;
      consciencia?: number;
      extroversao?: number;
      amabilidade?: number;
      neuroticismo?: number;
    };
  }>;
  paginacao?: { limit: number; offset: number; temMais: boolean };
};

export type DashboardPesquisaOpiniao = {
  id: string;
  titulo: string;
  descricao?: string | null;
  ativo?: boolean;
  criadoEm?: string;
};

export type DashboardOpiniaoResumo = {
  id: string;
  titulo: string;
  descricao?: string | null;
  totalRespostasFiltradas: number;
  filtrosAplicados?: DashboardFilters;
  resultado: Array<{
    id: string;
    texto: string;
    opcoes: Array<{
      id: string;
      texto: string;
      total: number;
    }>;
  }>;
};

export type DashboardOpiniaoParticipante = {
  id: string;
  respondidoEm?: string;
  estado?: string | null;
  cidade?: string | null;
  bairro?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coordenada?: { latitude?: number | null; longitude?: number | null } | null;
  participante?: { id?: string; nome?: string | null; contatoOpcional?: string | null };
  entrevistador?: { id?: string; nome?: string | null; email?: string | null };
};

export type DashboardOpiniaoParticipantes = {
  pesquisaId: string;
  total: number;
  totalFiltrado: number;
  filtrosAplicados?: DashboardFilters;
  paginacao?: { limit: number; offset: number; temMais: boolean };
  respostas: DashboardOpiniaoParticipante[];
};
