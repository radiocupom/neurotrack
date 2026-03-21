export type JornadaStep = "identificacao" | "senso" | "bigfive" | "finalizado";

export type JornadaStoreState = {
  campanhaSelecionada: string;
  participanteId: string;
  telefone: string;
  questionarioSensoId: string;
  etapaAtual: JornadaStep;
};

export const initialJornadaStoreState: JornadaStoreState = {
  campanhaSelecionada: "",
  participanteId: "",
  telefone: "",
  questionarioSensoId: "",
  etapaAtual: "identificacao",
};

type JornadaStoreAction =
  | { type: "setCampanhaSelecionada"; payload: string }
  | { type: "setParticipanteId"; payload: string }
  | { type: "setTelefone"; payload: string }
  | { type: "setQuestionarioSensoId"; payload: string }
  | { type: "setEtapaAtual"; payload: JornadaStep }
  | { type: "reset" };

export function jornadaStoreReducer(state: JornadaStoreState, action: JornadaStoreAction): JornadaStoreState {
  switch (action.type) {
    case "setCampanhaSelecionada":
      return { ...state, campanhaSelecionada: action.payload };
    case "setParticipanteId":
      return { ...state, participanteId: action.payload };
    case "setTelefone":
      return { ...state, telefone: action.payload };
    case "setQuestionarioSensoId":
      return { ...state, questionarioSensoId: action.payload };
    case "setEtapaAtual":
      return { ...state, etapaAtual: action.payload };
    case "reset":
      return initialJornadaStoreState;
    default:
      return state;
  }
}
