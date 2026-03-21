import "global-jsdom/register";

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { normalizeJornadaState } from "@/app/sensobigfive/normalize-jornada-state";
import { SensoBigFiveWorkflow } from "@/app/sensobigfive/senso-bigfive-workflow";
import {
  CAMPAIGNS_PERMISSION_MESSAGE,
  INVALID_CAMPAIGN_MESSAGE,
} from "@/app/sensobigfive/workflow-utils";

const QUESTIONARIO_ID = "11111111-1111-4111-8111-111111111111";
const CAMPANHA_ID = "22222222-2222-4222-8222-222222222222";
const PARTICIPANTE_ID = "44444444-4444-4444-8444-444444444444";

const QUESTIONARIO_BASE = {
  id: QUESTIONARIO_ID,
  titulo: "Senso Populacional",
  perguntas: [
    {
      id: "p1",
      texto: "Qual sua faixa etaria?",
      opcoes: [
        { id: "o1", texto: "18-24" },
        { id: "o2", texto: "25-34" },
      ],
    },
  ],
};

const BIGFIVE_QUESTIONARIO = {
  titulo: "Questionario Big Five",
  descricao: "Responda cada afirmacao conforme seu comportamento.",
  escala: {
    min: 1,
    max: 5,
    labels: {
      "1": "Discordo totalmente",
      "2": "Discordo",
      "3": "Neutro",
      "4": "Concordo",
      "5": "Concordo totalmente",
    },
  },
  perguntas: [
    {
      campo: "abertura1",
      fator: "Abertura",
      ordem: 1,
      texto: "Gosto de experimentar ideias e atividades novas.",
    },
    {
      campo: "consc1",
      fator: "Conscienciosidade",
      ordem: 2,
      texto: "Procuro manter minhas tarefas organizadas.",
    },
    {
      campo: "neuro3",
      fator: "Neuroticismo",
      ordem: 3,
      texto: "Demoro a me recuperar depois de uma situacao estressante.",
    },
  ],
};

const loggedUser = {
  id: "33333333-3333-4333-8333-333333333333",
  nome: "Operador Teste",
  email: "operador@teste.com",
  papel: "ADMIN",
} as const;

function createJsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as unknown as Response;
}

function setupFetchSequence(responses: Response[]) {
  const queue = [...responses];

  const fetchMock = mock.fn(async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : "url" in input
            ? input.url
            : "";

    if (url.includes("servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")) {
      return createJsonResponse([
        { id: 35, sigla: "SP", nome: "Sao Paulo" },
        { id: 33, sigla: "RJ", nome: "Rio de Janeiro" },
      ]);
    }

    if (url.includes("servicodados.ibge.gov.br/api/v1/localidades/estados/") && url.includes("/municipios?orderBy=nome")) {
      return createJsonResponse([
        { id: 3550308, nome: "Sao Paulo" },
        { id: 3509502, nome: "Campinas" },
      ]);
    }

    if (url.includes("servicodados.ibge.gov.br/api/v1/localidades/municipios/") && url.includes("/subdistritos?orderBy=nome")) {
      return createJsonResponse([
        { id: 1, nome: "Centro" },
        { id: 2, nome: "Jardim" },
      ]);
    }

    return queue.length > 0 ? queue.shift() : createJsonResponse(null);
  });

  global.fetch = fetchMock as typeof fetch;

  return fetchMock;
}

describe("normalizeJornadaState", () => {
  it("prioriza precheck para campanha, participante e etapa", () => {
    const normalized = normalizeJornadaState({
      precheck: {
        participanteId: "precheck-participante",
        campanha: { id: "precheck-campanha", nome: "Campanha Precheck" },
        questionario: { id: "questionario-precheck", titulo: "Questionario Precheck" },
        status: { etapaAtual: "BIGFIVE", podeResponderBigFive: true },
      },
      proximoPasso: {
        tipo: "SENSO_POPULACIONAL",
        participanteId: "proximo-participante",
        campanhaId: "proximo-campanha",
      },
      fallback: {
        campanhaId: "fallback-campanha",
      },
    });

    assert.equal(normalized.participanteId, "precheck-participante");
    assert.equal(normalized.campanhaId, "precheck-campanha");
    assert.equal(normalized.campanhaNome, "Campanha Precheck");
    assert.equal(normalized.questionarioId, "questionario-precheck");
    assert.equal(normalized.questionarioTitulo, "Questionario Precheck");
    assert.equal(normalized.etapaAtual, "BIGFIVE");
    assert.equal(normalized.uiStep, "bigfive");
    assert.equal(normalized.podeResponderBigFive, true);
  });

  it("usa fluxo da resposta final do Big Five para etapa e origem", () => {
    const normalized = normalizeJornadaState({
      precheck: {
        status: { etapaAtual: "BIGFIVE" },
      },
      bigFiveResultado: {
        fluxo: {
          etapaAtual: "JORNADA_CONCLUIDA",
          campanhaId: "campanha-fluxo",
          origem: "PUBLICO",
        },
        mensagem: "Fluxo finalizado no backend",
      },
    });

    assert.equal(normalized.etapaAtual, "JORNADA_CONCLUIDA");
    assert.equal(normalized.uiStep, "finalizado");
    assert.equal(normalized.campanhaId, "campanha-fluxo");
    assert.equal(normalized.origem, "PUBLICO");
    assert.equal(normalized.mensagem, "Fluxo finalizado no backend");
  });
});

describe("SensoBigFiveWorkflow", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
    mock.reset();
  });

  it("bloqueia confirmacao sem campanha selecionada", async () => {
    setupFetchSequence([
      createJsonResponse(QUESTIONARIO_BASE),
      createJsonResponse([{ id: CAMPANHA_ID, nome: "Senso Araruama", questionarioId: QUESTIONARIO_ID, ativo: true }]),
      createJsonResponse([{ id: QUESTIONARIO_ID, nome: "Questionario Base" }]),
    ]);

    render(<SensoBigFiveWorkflow loggedUser={loggedUser} />);

    await screen.findByText("Campanha da jornada");

    const confirmButton = screen.getByRole("button", { name: "Confirmar participante" }) as HTMLButtonElement;
    const campaignSelect = screen.getByLabelText("Campanha") as HTMLSelectElement;

    assert.equal(confirmButton.disabled, true);
    assert.equal(campaignSelect.value, "");
  });

  it("abre cadastro quando participante nao existe", async () => {
    setupFetchSequence([
      createJsonResponse(QUESTIONARIO_BASE),
      createJsonResponse([{ id: CAMPANHA_ID, nome: "Senso Araruama", questionarioId: QUESTIONARIO_ID, ativo: true }]),
      createJsonResponse([{ id: QUESTIONARIO_ID, nome: "Questionario Base" }]),
      createJsonResponse({ found: false, participante: null }),
    ]);

    render(<SensoBigFiveWorkflow loggedUser={loggedUser} />);

    await screen.findByText("Campanha da jornada");

    fireEvent.change(screen.getByLabelText("Campanha"), { target: { value: CAMPANHA_ID } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar participante" }));
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "55999999999" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await screen.findByText("Cadastrar participante");
  });

  it("abre cadastro quando busca retorna 404", async () => {
    setupFetchSequence([
      createJsonResponse(QUESTIONARIO_BASE),
      createJsonResponse([{ id: CAMPANHA_ID, nome: "Senso Araruama", questionarioId: QUESTIONARIO_ID, ativo: true }]),
      createJsonResponse([{ id: QUESTIONARIO_ID, nome: "Questionario Base" }]),
      createJsonResponse({ message: "Participante nao encontrado" }, 404),
    ]);

    render(<SensoBigFiveWorkflow loggedUser={loggedUser} />);

    await screen.findByText("Campanha da jornada");

    fireEvent.change(screen.getByLabelText("Campanha"), { target: { value: CAMPANHA_ID } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar participante" }));
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "55999999999" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await screen.findByText("Cadastrar participante");
  });

  it("bloqueia e limpa campanha quando precheck retorna 404 de campanha", async () => {
    setupFetchSequence([
      createJsonResponse(QUESTIONARIO_BASE),
      createJsonResponse([{ id: CAMPANHA_ID, nome: "Senso Araruama", questionarioId: QUESTIONARIO_ID, ativo: true }]),
      createJsonResponse([{ id: QUESTIONARIO_ID, nome: "Questionario Base" }]),
      createJsonResponse({ found: true, participante: { id: PARTICIPANTE_ID, nome: "Maria" } }),
      createJsonResponse({ message: "Campanha inativa" }, 404),
    ]);

    render(<SensoBigFiveWorkflow loggedUser={loggedUser} />);

    await screen.findByText("Campanha da jornada");

    fireEvent.change(screen.getByLabelText("Campanha"), { target: { value: CAMPANHA_ID } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar participante" }));
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "55999999999" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    const messages = await screen.findAllByText(INVALID_CAMPAIGN_MESSAGE);
    assert.ok(messages.length >= 1);

    const campaignSelect = screen.getByLabelText("Campanha") as HTMLSelectElement;
    assert.equal(campaignSelect.value, "");
  });

  it("executa fluxo feliz completo", async () => {
    setupFetchSequence([
      createJsonResponse(QUESTIONARIO_BASE),
      createJsonResponse([{ id: CAMPANHA_ID, nome: "Senso Araruama", questionarioId: QUESTIONARIO_ID, ativo: true }]),
      createJsonResponse([{ id: QUESTIONARIO_ID, nome: "Questionario Base" }]),
      createJsonResponse({ found: true, participante: { id: PARTICIPANTE_ID, nome: "Maria", telefone: "55999999999" } }),
      createJsonResponse({ participanteId: PARTICIPANTE_ID, status: { etapaAtual: "SENSO_POPULACIONAL" } }),
      createJsonResponse({ ok: true }, 201),
      createJsonResponse({ participanteId: PARTICIPANTE_ID, status: { etapaAtual: "BIGFIVE" } }),
      createJsonResponse(BIGFIVE_QUESTIONARIO),
      createJsonResponse({ fluxo: { etapaAtual: "JORNADA_CONCLUIDA", campanhaId: CAMPANHA_ID, origem: "PRIVADO" } }, 200),
    ]);

    render(<SensoBigFiveWorkflow loggedUser={loggedUser} />);

    await screen.findByText("Campanha da jornada");

    fireEvent.change(screen.getByLabelText("Campanha"), { target: { value: CAMPANHA_ID } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar participante" }));
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "55999999999" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await screen.findByText("Formulario de Senso Populacional");
    fireEvent.change(screen.getByLabelText("Cidade"), { target: { value: "3550308" } });
    await screen.findByRole("option", { name: "Centro" });
    fireEvent.change(screen.getByLabelText("Bairro"), { target: { value: "1" } });
    fireEvent.click(screen.getByLabelText("18-24"));
    fireEvent.click(screen.getByRole("button", { name: "Enviar Senso" }));

    await screen.findByText("Questionario Big Five");
    await screen.findByText("Gosto de experimentar ideias e atividades novas.");
    assert.equal(screen.queryByText("Abertura 1"), null);

    fireEvent.click(screen.getAllByLabelText("5 - Concordo totalmente")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Finalizar Big Five" }));

    await screen.findByText("Pesquisa concluida com sucesso. Jornada finalizada e pronta para nova aplicacao.");
  });

  it("bloqueia formulario Big Five quando precheck sinaliza podeResponderBigFive false", async () => {
    setupFetchSequence([
      createJsonResponse(QUESTIONARIO_BASE),
      createJsonResponse([{ id: CAMPANHA_ID, nome: "Senso Araruama", questionarioId: QUESTIONARIO_ID, ativo: true }]),
      createJsonResponse([{ id: QUESTIONARIO_ID, nome: "Questionario Base" }]),
      createJsonResponse({ found: true, participante: { id: PARTICIPANTE_ID, nome: "Maria", telefone: "55999999999" } }),
      createJsonResponse({
        participanteId: PARTICIPANTE_ID,
        campanha: { id: CAMPANHA_ID, nome: "Senso Araruama" },
        status: { etapaAtual: "BIGFIVE", podeResponderBigFive: false },
      }),
      createJsonResponse(BIGFIVE_QUESTIONARIO),
    ]);

    render(<SensoBigFiveWorkflow loggedUser={loggedUser} />);

    await screen.findByText("Campanha da jornada");

    fireEvent.change(screen.getByLabelText("Campanha"), { target: { value: CAMPANHA_ID } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar participante" }));
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "55999999999" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await screen.findByText("Questionario Big Five");

    const submitButton = screen.getByRole("button", { name: "Finalizar Big Five" }) as HTMLButtonElement;
    assert.equal(submitButton.disabled, true);
  });

  it("mostra conclusao imediata quando jornada ja concluida", async () => {
    setupFetchSequence([
      createJsonResponse(QUESTIONARIO_BASE),
      createJsonResponse([{ id: CAMPANHA_ID, nome: "Senso Araruama", questionarioId: QUESTIONARIO_ID, ativo: true }]),
      createJsonResponse([{ id: QUESTIONARIO_ID, nome: "Questionario Base" }]),
      createJsonResponse({ found: true, participante: { id: PARTICIPANTE_ID, nome: "Maria" } }),
      createJsonResponse({ participanteId: PARTICIPANTE_ID, status: { etapaAtual: "JORNADA_CONCLUIDA" } }),
    ]);

    render(<SensoBigFiveWorkflow loggedUser={loggedUser} />);

    await screen.findByText("Campanha da jornada");

    fireEvent.change(screen.getByLabelText("Campanha"), { target: { value: CAMPANHA_ID } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar participante" }));
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "55999999999" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await screen.findByText("Jornada ja concluida para este participante na campanha selecionada.");
  });

  it("mostra erro de permissao ao carregar campanhas", async () => {
    setupFetchSequence([
      createJsonResponse(QUESTIONARIO_BASE),
      createJsonResponse({ message: "forbidden" }, 403),
      createJsonResponse([{ id: QUESTIONARIO_ID, nome: "Questionario Base" }]),
    ]);

    render(<SensoBigFiveWorkflow loggedUser={loggedUser} />);

    await screen.findByText(CAMPAIGNS_PERMISSION_MESSAGE);
  });
});
