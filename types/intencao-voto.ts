export const CARGOS_INTENCAO_VOTO = [
  "PRESIDENTE",
  "SENADOR",
  "DEPUTADO_FEDERAL",
  "DEPUTADO_ESTADUAL",
  "GOVERNADOR",
  "PREFEITO",
  "VEREADOR",
] as const;

export type CargoIntencaoVoto = (typeof CARGOS_INTENCAO_VOTO)[number];

export const PARTIDOS_INTENCAO_VOTO = [
  "AGIR",
  "AVANTE",
  "CIDADANIA",
  "DC",
  "MDB",
  "MISSÃO",
  "MOBILIZA",
  "NOVO",
  "PCB",
  "PCdoB",
  "PCO",
  "PDT",
  "PL",
  "PODE",
  "PP",
  "PRD",
  "PRTB",
  "PSB",
  "PSD",
  "PSDB",
  "PSOL",
  "PSTU",
  "PT",
  "PV",
  "REDE",
  "REPUBLICANOS",
  "SOLIDARIEDADE",
  "UNIÃO",
  "UP",
  "DEMOCRATA",
] as const;

export type PartidoIntencaoVoto = (typeof PARTIDOS_INTENCAO_VOTO)[number];

export type ParticipanteIntencaoVoto = {
  id: string;
  participanteId?: string;
  nome: string;
  email?: string | null;
  contatoOpcional?: string | null;
  telefone?: string | null;
  criadoEm?: string;
};

export type ParticipanteIntencaoVotoNormalizado = {
  id: string;
  nome: string;
  email?: string | null;
  contato?: string | null;
};

export type CanalVoto = "PRESENCIAL" | "WHATSAPP" | string;

export type CandidatoIntencaoVoto = {
  id: string;
  nome: string;
  partido?: string | null;
  fotoUrl?: string | null;
};

export type PesquisaIntencaoVoto = {
  id: string;
  titulo: string;
  descricao?: string | null;
  cargo: string;
  ativo?: boolean;
  urlPublica?: string | null;
  urlPesquisa?: string | null;
  idRegistroTSE?: string | null;
  criadoPorId?: string | null;
  criadoEm?: string;
  candidatos: CandidatoIntencaoVoto[];
};

export type RankingCandidatoIntencaoVoto = {
  candidatoId: string;
  nome: string;
  partido?: string | null;
  fotoUrl?: string | null;
  votos: number;
  percentual?: number | null;
};

export type VotosPorCanalIntencaoVoto = {
  canal: string;
  total: number;
};

export type VotoGeolocalizadoIntencaoVoto = {
  id: string;
  canal?: string | null;
  idade?: number | null;
  estado?: string | null;
  cidade?: string | null;
  bairro?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coordenada?: { latitude?: number | null; longitude?: number | null } | null;
  criadoEm?: string;
  candidato?: {
    id?: string;
    nome?: string | null;
    partido?: string | null;
    fotoUrl?: string | null;
  };
  participante?: {
    id?: string;
    nome?: string | null;
    contatoOpcional?: string | null;
  };
  entrevistador?: {
    id?: string;
    nome?: string | null;
    email?: string | null;
  };
};

export type ResultadoIntencaoVoto = {
  totalVotos: number;
  ranking: RankingCandidatoIntencaoVoto[];
  votosPorCanal: VotosPorCanalIntencaoVoto[];
  votosGeolocalizados: VotoGeolocalizadoIntencaoVoto[];
  cache?: Record<string, unknown> | null;
};

export type PesquisaIntencaoVotoDetalhe = PesquisaIntencaoVoto & {
  resultado?: ResultadoIntencaoVoto;
};

export type CandidatoIntencaoVotoInput = {
  id?: string;
  nome: string;
  partido: string;
  fotoUrl?: string;
};

export type CriarPesquisaIntencaoVotoPayload = {
  titulo: string;
  descricao?: string;
  idRegistroTSE?: string;
  urlPesquisa?: string;
  cargo: string;
  criadoPorId: string;
  candidatos: CandidatoIntencaoVotoInput[];
};

export type AtualizarPesquisaIntencaoVotoPayload = {
  titulo?: string;
  descricao?: string;
  idRegistroTSE?: string;
  urlPesquisa?: string;
  cargo?: string;
  ativo?: boolean;
  candidatos?: CandidatoIntencaoVotoInput[];
};

export type PayloadRegistrarVotoPrivado = {
  estado: string;
  cidade: string;
  bairro: string;
  idade: number;
  telefone: string;
  participanteId: string;
  candidatoId: string;
  pesquisaId: string;
  canal: CanalVoto;
};

export type PayloadRegistrarVotoPublico = {
  telefone: string;
  nome?: string;
  email?: string;
  estado: string;
  cidade: string;
  bairro: string;
  idade: number;
  candidatoId: string;
  canal: CanalVoto;
};

export type VotoRegistrado = {
  id: string;
  pesquisaId?: string;
  participanteId?: string;
  candidatoId?: string;
  canal?: string;
  criadoEm?: string;
};

export type ApiResponse<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
};

export type StatusFilaIntencaoVoto = {
  total: number;
  pendentes: number;
  processadas: number;
  falhas: number;
};