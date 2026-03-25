"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { CheckCircle2, Plus, Search, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getBrowserCache, setBrowserCache } from "@/lib/cache/browser-cache";
import type { AuthUser } from "@/lib/auth/types";
import {
	CAMPAIGNS_PERMISSION_MESSAGE,
	INVALID_CAMPAIGN_MESSAGE,
	PARTICIPANTE_NOT_FOUND_MESSAGE,
	SELECT_CAMPAIGN_MESSAGE,
	isValidUuid,
	mapCampanhasLoadError,
	normalizeCampanha,
	normalizeCampanhas,
	type WorkflowCampanha,
} from "@/app/sensobigfive/workflow-utils";
import {
	buscarParticipantePorContato,
	carregarCampanhas,
	carregarQuestionariosPrivados,
	carregarQuestionarioSenso,
	criarCampanha,
	atualizarCampanha,
	criarParticipante,
	carregarQuestionarioBigFiveAction,
	enviarBigFive,
	enviarSenso,
	precheckJornada,
	type QuestionarioSensoBase,
} from "@/app/sensobigfive/jornada-actions";
import {
	carregarCidadesPorUf,
	carregarEstadosBrasileiros,
	type CidadeOption,
	type EstadoOption,
} from "@/service/localidades-publicas.service";
import {
	initialJornadaStoreState,
	jornadaStoreReducer,
	type JornadaStep,
} from "@/app/sensobigfive/jornada-store";
import {
	normalizeJornadaState,
	type ApiEtapaAtual,
	type NormalizedJornadaState,
} from "@/app/sensobigfive/normalize-jornada-state";
import type { CanalBigFive } from "@/service/bigfive.service";

type Participante = {
	id?: string;
	nome: string;
	email?: string;
	telefone?: string;
	contatoOpcional?: string;
};

type Questionario = {
	id: string;
	nome?: string;
	titulo?: string;
	urlPublica?: string;
};

type ScoreKey =
	| "abertura1"
	| "abertura2"
	| "abertura3"
	| "consc1"
	| "consc2"
	| "consc3"
	| "extro1"
	| "extro2"
	| "extro3"
	| "amavel1"
	| "amavel2"
	| "amavel3"
	| "neuro1"
	| "neuro2"
	| "neuro3";

type Step = JornadaStep;

type Toast = {
	id: number;
	tone: "success" | "error";
	message: string;
};

type BigFivePergunta = {
	campo: ScoreKey;
	fator: string;
	ordem: number;
	texto: string;
};

type BigFiveQuestionario = {
	titulo: string;
	descricao: string;
	escala: {
		min: number;
		max: number;
		labels: Record<string, string>;
	};
	perguntas: BigFivePergunta[];
};

const DEFAULT_BIGFIVE: Record<ScoreKey, number> = {
	abertura1: 3,
	abertura2: 3,
	abertura3: 3,
	consc1: 3,
	consc2: 3,
	consc3: 3,
	extro1: 3,
	extro2: 3,
	extro3: 3,
	amavel1: 3,
	amavel2: 3,
	amavel3: 3,
	neuro1: 3,
	neuro2: 3,
	neuro3: 3,
};

const SCORE_KEYS = Object.keys(DEFAULT_BIGFIVE) as ScoreKey[];
const SCORE_KEYS_SET = new Set<ScoreKey>(SCORE_KEYS);
const BIGFIVE_CANAIS: CanalBigFive[] = ["WHATSAPP", "TELEFONE", "PRESENCIAL", "OUTRO"];

const SENSO_STEP_MESSAGE = "Participante localizado na jornada. Prosseguindo para a aplicacao da pesquisa.";
const BIGFIVE_STEP_MESSAGE = "Senso ja respondido nesta campanha. Prosseguindo diretamente para o Big Five.";
const CONCLUIDA_STEP_MESSAGE = "Jornada ja concluida para este participante na campanha selecionada.";
const BIGFIVE_BLOCKED_MESSAGE = "Big Five bloqueado para esta jornada. Reinicie o fluxo caso os dados de campanha/participante estejam inconsistentes.";

function normalizeList<T>(data: unknown): T[] {
	if (Array.isArray(data)) return data as T[];
	if (data && typeof data === "object") {
		const payload = data as Record<string, unknown>;
		if (Array.isArray(payload.data)) return payload.data as T[];
		if (Array.isArray(payload.items)) return payload.items as T[];
		if (Array.isArray(payload.resultado)) return payload.resultado as T[];
	}
	return [];
}

function readObject(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function toApiEtapa(step: Step): ApiEtapaAtual {
	if (step === "bigfive") {
		return "BIGFIVE";
	}

	if (step === "finalizado") {
		return "JORNADA_CONCLUIDA";
	}

	return "SENSO_POPULACIONAL";
}

function defaultMessageByEtapa(etapaAtual: ApiEtapaAtual) {
	if (etapaAtual === "BIGFIVE") {
		return BIGFIVE_STEP_MESSAGE;
	}

	if (etapaAtual === "JORNADA_CONCLUIDA") {
		return CONCLUIDA_STEP_MESSAGE;
	}

	return SENSO_STEP_MESSAGE;
}

function isScoreKey(value: string): value is ScoreKey {
	return SCORE_KEYS_SET.has(value as ScoreKey);
}

function normalizeBigFiveQuestionario(payload: unknown): BigFiveQuestionario | null {
	if (!payload || typeof payload !== "object") {
		return null;
	}

	const source = payload as {
		titulo?: unknown;
		descricao?: unknown;
		escala?: {
			min?: unknown;
			max?: unknown;
			labels?: unknown;
		};
		perguntas?: Array<{
			campo?: unknown;
			fator?: unknown;
			ordem?: unknown;
			texto?: unknown;
		}>;
	};

	const escala = source.escala;
	const min = typeof escala?.min === "number" ? escala.min : 1;
	const max = typeof escala?.max === "number" ? escala.max : 5;

	if (!Array.isArray(source.perguntas)) {
		return null;
	}

	const perguntas = source.perguntas
		.map((item) => {
			if (!item || typeof item !== "object") {
				return null;
			}

			const campo = typeof item.campo === "string" ? item.campo.trim() : "";
			if (!campo || !isScoreKey(campo)) {
				return null;
			}

			const texto = typeof item.texto === "string" ? item.texto.trim() : "";
			if (!texto) {
				return null;
			}

			return {
				campo,
				fator: typeof item.fator === "string" ? item.fator.trim() : "",
				ordem: typeof item.ordem === "number" ? item.ordem : Number.MAX_SAFE_INTEGER,
				texto,
			} satisfies BigFivePergunta;
		})
		.filter((item): item is BigFivePergunta => item != null)
		.sort((first, second) => first.ordem - second.ordem);

	if (perguntas.length === 0) {
		return null;
	}

	const labelsSource = escala?.labels && typeof escala.labels === "object" ? (escala.labels as Record<string, unknown>) : {};
	const labels: Record<string, string> = {};

	for (let value = min; value <= max; value += 1) {
		const key = String(value);
		const label = labelsSource[key];
		labels[key] = typeof label === "string" && label.trim() ? label.trim() : key;
	}

	return {
		titulo: typeof source.titulo === "string" && source.titulo.trim() ? source.titulo.trim() : "Questionario Big Five",
		descricao: typeof source.descricao === "string" ? source.descricao.trim() : "",
		escala: { min, max, labels },
		perguntas,
	};
}

function normalizeParticipant(data: unknown) {
	if (!data || typeof data !== "object") return null;

	const payload = data as {
		id?: unknown;
		nome?: unknown;
		email?: unknown;
		telefone?: unknown;
		contatoOpcional?: unknown;
		participante?: {
			id?: unknown;
			nome?: unknown;
			email?: unknown;
			telefone?: unknown;
			contatoOpcional?: unknown;
		};
	};

	const source = payload.participante && typeof payload.participante === "object" ? payload.participante : payload;
	const participanteSource = source as { participanteId?: unknown; contato?: unknown };

	return {
		id:
			typeof source.id === "string"
				? source.id
				: typeof participanteSource.participanteId === "string"
					? participanteSource.participanteId
					: undefined,
		nome: typeof source.nome === "string" ? source.nome : undefined,
		email: typeof source.email === "string" ? source.email : undefined,
		telefone:
			typeof source.telefone === "string"
				? source.telefone
				: typeof participanteSource.contato === "string"
					? participanteSource.contato
					: undefined,
		contatoOpcional:
			typeof source.contatoOpcional === "string"
				? source.contatoOpcional
				: typeof participanteSource.contato === "string"
					? participanteSource.contato
					: undefined,
	};
}

function readParticipantLookup(data: unknown) {
	if (!data || typeof data !== "object") {
		return { found: false, participante: null as unknown };
	}

	const payload = data as { found?: unknown; participante?: unknown };

	if (typeof payload.found === "boolean") {
		return { found: payload.found, participante: payload.participante ?? null };
	}

	return { found: true, participante: data };
}

function sanitizeTelefone(value: string) {
	return value.replace(/\D/g, "").trim();
}

function isValidTelefone(value: string) {
	return /^\d{10,15}$/.test(value);
}

export type SensoBigFiveWorkflowProps = {
	loggedUser: AuthUser;
	mode?: "aplicar" | "campanhas";
};

const MANAGER_ROLES = new Set(["SUPERADMIN", "ADMIN"]);
const CAMPAIGN_CACHE_KEY = "senso-bigfive-campaigns";
const CAMPAIGN_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

function mergeCampaignCollections(current: WorkflowCampanha[], incoming: WorkflowCampanha[]) {
	const merged = new Map<string, WorkflowCampanha>();

	for (const item of current) {
		merged.set(item.id, item);
	}

	for (const item of incoming) {
		const previous = merged.get(item.id);
		merged.set(item.id, {
			...previous,
			...item,
		});
	}

	return Array.from(merged.values()).sort((first, second) => first.nome.localeCompare(second.nome, "pt-BR"));
}

export function SensoBigFiveWorkflow({ loggedUser, mode = "aplicar" }: SensoBigFiveWorkflowProps) {
	const [store, dispatch] = useReducer(jornadaStoreReducer, initialJornadaStoreState);
	const [step, setStep] = useState<Step>("identificacao");
	const [participante, setParticipante] = useState<Participante | null>(null);

	const [questionarios, setQuestionarios] = useState<Questionario[]>([]);
	const [questionarioBase, setQuestionarioBase] = useState<QuestionarioSensoBase | null>(null);
	const [campanhas, setCampanhas] = useState<WorkflowCampanha[]>([]);

	const [campanhaId, setCampanhaId] = useState("");
	const [campanhaGestaoId, setCampanhaGestaoId] = useState("");
	const [manualCampaignId, setManualCampaignId] = useState("");
	const [estado, setEstado] = useState("SP");
	const [cidade, setCidade] = useState("");
	const [bairro, setBairro] = useState("");
	const [cidadeId, setCidadeId] = useState<number | null>(null);
	const [estados, setEstados] = useState<EstadoOption[]>([]);
	const [cidades, setCidades] = useState<CidadeOption[]>([]);
	const [loadingEstados, setLoadingEstados] = useState(false);
	const [loadingCidades, setLoadingCidades] = useState(false);
	const [respostasSenso, setRespostasSenso] = useState<Record<string, string>>({});
	const [scores, setScores] = useState<Record<ScoreKey, number>>(DEFAULT_BIGFIVE);
	const [canalBigFive, setCanalBigFive] = useState<"" | CanalBigFive>("");
	const [idadeBigFive, setIdadeBigFive] = useState("");
	const [telefoneBigFive, setTelefoneBigFive] = useState("");

	const [confirmModalOpen, setConfirmModalOpen] = useState(false);
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [telefoneBusca, setTelefoneBusca] = useState("");
	const [nomeNovoParticipante, setNomeNovoParticipante] = useState("");
	const [emailNovoParticipante, setEmailNovoParticipante] = useState("");
	const [nomeNovaCampanha, setNomeNovaCampanha] = useState("");
	const [descricaoNovaCampanha, setDescricaoNovaCampanha] = useState("");
	const [questionarioNovaCampanhaId, setQuestionarioNovaCampanhaId] = useState("");

	const [loadingBaseData, setLoadingBaseData] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [creatingCampaign, setCreatingCampaign] = useState(false);
	const [updatingCampaignStatus, setUpdatingCampaignStatus] = useState(false);
	const [processingSenso, setProcessingSenso] = useState(false);
	const [error, setError] = useState("");
	const [feedback, setFeedback] = useState("");
	const [toasts, setToasts] = useState<Toast[]>([]);
	const [bigFiveQuestionario, setBigFiveQuestionario] = useState<BigFiveQuestionario | null>(null);
	const [loadingBigFiveQuestionario, setLoadingBigFiveQuestionario] = useState(false);
	const [bigFiveQuestionarioError, setBigFiveQuestionarioError] = useState("");
	const [jornadaState, setJornadaState] = useState<NormalizedJornadaState>(() =>
		normalizeJornadaState({
			fallback: {
				etapaAtual: "SENSO_POPULACIONAL",
			},
		}),
	);

	const canManageCampanhas = MANAGER_ROLES.has(loggedUser.papel);
	const campanhasAtivas = useMemo(() => campanhas.filter((item) => item.ativo), [campanhas]);
	const selectedCampanhaGestao = useMemo(
		() => campanhas.find((item) => item.id === campanhaGestaoId) ?? null,
		[campanhaGestaoId, campanhas],
	);
	const selectedCampanha = useMemo(
		() => campanhasAtivas.find((item) => item.id === campanhaId) ?? null,
		[campanhaId, campanhasAtivas],
	);
	const selectedQuestionario = useMemo(
		() =>
			questionarios.find((item) => item.id === selectedCampanha?.questionarioId) ??
			(questionarioBase && questionarioBase.id === selectedCampanha?.questionarioId
				? { id: questionarioBase.id, titulo: questionarioBase.titulo }
				: null),
		[questionarios, selectedCampanha, questionarioBase],
	);
	const selectedPesquisaPublicaUrl = useMemo(() => {
		const candidates = [selectedCampanha?.urlPublica, selectedQuestionario?.urlPublica];

		for (const candidate of candidates) {
			if (typeof candidate === "string" && candidate.trim()) {
				return candidate.trim();
			}
		}

		return "";
	}, [selectedCampanha, selectedQuestionario]);
	const canConfirmParticipant = Boolean(selectedCampanha) && !loadingBaseData && !submitting;
	const isBigFiveBlocked = step === "bigfive" && jornadaState.podeResponderBigFive === false;
	const shouldBlockBigFiveSubmit =
		isBigFiveBlocked || !jornadaState.participanteId.trim() || !jornadaState.campanhaId.trim();
	const bigFiveScaleOptions = useMemo(() => {
		const min = bigFiveQuestionario?.escala.min ?? 1;
		const max = bigFiveQuestionario?.escala.max ?? 5;

		const options: Array<{ value: number; label: string }> = [];
		for (let value = min; value <= max; value += 1) {
			options.push({
				value,
				label: bigFiveQuestionario?.escala.labels[String(value)] ?? String(value),
			});
		}

		return options;
	}, [bigFiveQuestionario]);

	function pushToast(message: string, tone: Toast["tone"] = "success") {
		const id = Date.now() + Math.floor(Math.random() * 1000);
		setToasts((prev) => [...prev, { id, tone, message }]);
		setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 3200);
	}

	function resetParticipantJourney() {
		setStep("identificacao");
		dispatch({ type: "setEtapaAtual", payload: "identificacao" });
		dispatch({ type: "setParticipanteId", payload: "" });
		dispatch({ type: "setTelefone", payload: "" });
		setParticipante(null);
		setFeedback("");
		setError("");
		setConfirmModalOpen(false);
		setCreateModalOpen(false);
		setCanalBigFive("");
		setIdadeBigFive("");
		setTelefoneBigFive("");
		setJornadaState((current) =>
			normalizeJornadaState({
				fallback: {
					campanhaId: campanhaId || current.campanhaId,
					campanhaNome: selectedCampanha?.nome || current.campanhaNome,
					questionarioId: store.questionarioSensoId || current.questionarioId,
					questionarioTitulo: selectedQuestionario?.titulo || selectedQuestionario?.nome || current.questionarioTitulo,
					etapaAtual: "SENSO_POPULACIONAL",
				},
			}),
		);
	}

	function clearConfirmationModalFields() {
		setTelefoneBusca("");
		setNomeNovoParticipante("");
		setEmailNovoParticipante("");
		setConfirmModalOpen(false);
		setCreateModalOpen(false);
	}

	function prepareNextApplicationWithSuccess(message: string) {
		setStep("identificacao");
		dispatch({ type: "setEtapaAtual", payload: "identificacao" });
		dispatch({ type: "setParticipanteId", payload: "" });
		dispatch({ type: "setTelefone", payload: "" });
		setParticipante(null);
		setCidade("");
		setCidadeId(null);
		setBairro("");
		setCidades([]);
		setRespostasSenso({});
		setScores(DEFAULT_BIGFIVE);
		setCanalBigFive("");
		setIdadeBigFive("");
		setTelefoneBigFive("");
		setProcessingSenso(false);
		clearConfirmationModalFields();
		setJornadaState(
			normalizeJornadaState({
				fallback: {
					campanhaId: campanhaId || store.campanhaSelecionada,
					campanhaNome: selectedCampanha?.nome || jornadaState.campanhaNome,
					questionarioId: store.questionarioSensoId || jornadaState.questionarioId,
					questionarioTitulo: selectedQuestionario?.titulo || selectedQuestionario?.nome || jornadaState.questionarioTitulo,
					etapaAtual: "SENSO_POPULACIONAL",
					mensagem: message,
					origem: "",
				},
			}),
		);
		setError("");
		setFeedback(message);
	}

	function mergeQuestionarioState(questionarioId: string, questionarioTitulo: string) {
		if (!questionarioId) {
			return;
		}

		setQuestionarios((current) => {
			const existing = current.find((item) => item.id === questionarioId);
			if (existing) {
				if (existing.titulo || existing.nome || !questionarioTitulo) {
					return current;
				}

				return current.map((item) =>
					item.id === questionarioId
						? {
							...item,
							titulo: questionarioTitulo,
						}
						: item,
				);
			}

			return [...current, { id: questionarioId, titulo: questionarioTitulo || questionarioId }];
		});
	}

	function mergeCampanhaState(campaignIdValue: string, campaignName: string, questionarioId: string) {
		if (!campaignIdValue) {
			return;
		}

		setCampanhas((current) => {
			const existing = current.find((item) => item.id === campaignIdValue);
			if (existing) {
				return current.map((item) =>
					item.id === campaignIdValue
						? {
							...item,
							nome: item.nome || campaignName || item.id,
							questionarioId: item.questionarioId || questionarioId,
						}
						: item,
				);
			}

			if (!questionarioId) {
				return current;
			}

			return [
				...current,
				{
					id: campaignIdValue,
					nome: campaignName || campaignIdValue,
					questionarioId,
					ativo: true,
				},
			];
		});
	}

	function applyJornadaHydration({
		precheck,
		proximoPasso,
		bigFiveResultado,
	}: {
		precheck?: unknown;
		proximoPasso?: unknown;
		bigFiveResultado?: unknown;
	}) {
		const normalized = normalizeJornadaState({
			precheck,
			proximoPasso,
			bigFiveResultado,
			fallback: {
				participanteId: store.participanteId || participante?.id,
				campanhaId: campanhaId || store.campanhaSelecionada,
				campanhaNome: selectedCampanha?.nome || jornadaState.campanhaNome,
				questionarioId: store.questionarioSensoId || selectedCampanha?.questionarioId || questionarioBase?.id || jornadaState.questionarioId,
				questionarioTitulo:
					selectedQuestionario?.titulo ||
					selectedQuestionario?.nome ||
					questionarioBase?.titulo ||
					jornadaState.questionarioTitulo,
				etapaAtual: toApiEtapa(step),
				mensagem: feedback,
				origem: jornadaState.origem,
			},
		});

		setJornadaState(normalized);

		if (normalized.participanteId && normalized.participanteId !== store.participanteId) {
			dispatch({ type: "setParticipanteId", payload: normalized.participanteId });
		}

		if (normalized.campanhaId) {
			if (normalized.campanhaId !== campanhaId) {
				setCampanhaId(normalized.campanhaId);
			}
			dispatch({ type: "setCampanhaSelecionada", payload: normalized.campanhaId });
		}

		if (normalized.questionarioId) {
			dispatch({ type: "setQuestionarioSensoId", payload: normalized.questionarioId });
		}

		mergeQuestionarioState(normalized.questionarioId, normalized.questionarioTitulo);
		mergeCampanhaState(normalized.campanhaId, normalized.campanhaNome, normalized.questionarioId);

		setStep(normalized.uiStep);
		dispatch({ type: "setEtapaAtual", payload: normalized.uiStep });

		if (normalized.mensagem) {
			setFeedback(normalized.mensagem);
		}

		return normalized;
	}

	function handleCampanhaChange(value: string) {
		setCampanhaId(value);
		dispatch({ type: "setCampanhaSelecionada", payload: value });
		const campanha = campanhasAtivas.find((item) => item.id === value);
		if (campanha?.questionarioId) {
			dispatch({ type: "setQuestionarioSensoId", payload: campanha.questionarioId });
		}
		resetParticipantJourney();
	}

	const persistCampaigns = useCallback((nextCampaigns: WorkflowCampanha[]) => {
		setBrowserCache(CAMPAIGN_CACHE_KEY, nextCampaigns, { ttl: CAMPAIGN_CACHE_TTL });
	}, []);

	const loadBaseData = useCallback(async (preferredCampaignId?: string) => {
		setLoadingBaseData(true);
		setError("");

		try {
			const [questionarioPublicoResult, campanhasResult, questionariosResult] = await Promise.all([
				carregarQuestionarioSenso(),
				carregarCampanhas(),
				carregarQuestionariosPrivados(),
			]);

			if (!questionariosResult.ok) throw new Error(questionariosResult.message || "Falha ao carregar questionarios.");
			if (!campanhasResult.ok) {
				throw new Error(mapCampanhasLoadError(campanhasResult.status, campanhasResult.message || CAMPAIGNS_PERMISSION_MESSAGE));
			}
			if (!questionarioPublicoResult.ok || !questionarioPublicoResult.data) {
				throw new Error(questionarioPublicoResult.message || "Falha ao carregar questionario base do senso.");
			}

			const qs = normalizeList<Questionario>(questionariosResult.data);
			const cs = normalizeCampanhas(campanhasResult.data);
			const cachedCampaigns = getBrowserCache<WorkflowCampanha[]>(CAMPAIGN_CACHE_KEY) ?? [];
			const mergedCampaigns = mergeCampaignCollections(cachedCampaigns, cs);

			setQuestionarios(qs);
			setQuestionarioBase(questionarioPublicoResult.data);
			setCampanhas(mergedCampaigns);
			persistCampaigns(mergedCampaigns);
			dispatch({ type: "setQuestionarioSensoId", payload: questionarioPublicoResult.data.id });

			setQuestionarioNovaCampanhaId((current) => current || qs[0]?.id || "");
			setCampanhaId((current) => {
				const candidate = preferredCampaignId || current;
				return mergedCampaigns.some((item) => item.id === candidate && item.ativo) ? candidate : "";
			});
			setCampanhaGestaoId((current) => {
				const candidate = preferredCampaignId || current;
				return mergedCampaigns.some((item) => item.id === candidate) ? candidate : mergedCampaigns[0]?.id || "";
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erro ao carregar dados base.");
		} finally {
			setLoadingBaseData(false);
		}
	}, [dispatch, persistCampaigns]);

	useEffect(() => {
		void loadBaseData();
	}, [loadBaseData]);

	useEffect(() => {
		let canceled = false;

		const loadEstados = async () => {
			setLoadingEstados(true);

			try {
				const result = await carregarEstadosBrasileiros();
				const estadosData = result.data;

				if (!result.ok || !estadosData) {
					throw new Error(result.message || "Falha ao carregar estados.");
				}

				if (canceled) {
					return;
				}

				setEstados(estadosData);
				setEstado((current) => {
					if (estadosData.some((item) => item.sigla === current)) {
						return current;
					}

					return estadosData[0]?.sigla ?? current;
				});
			} catch (err) {
				if (!canceled) {
					setError(err instanceof Error ? err.message : "Falha ao carregar estados.");
				}
			} finally {
				if (!canceled) {
					setLoadingEstados(false);
				}
			}
		};

		void loadEstados();

		return () => {
			canceled = true;
		};
	}, []);

	useEffect(() => {
		if (!estado.trim()) {
			setCidades([]);
			setCidade("");
			setCidadeId(null);
			setBairro("");
			return;
		}

		let canceled = false;

		const loadCidades = async () => {
			setLoadingCidades(true);
			setCidade("");
			setCidadeId(null);
			setBairro("");

			try {
				const result = await carregarCidadesPorUf(estado);
				if (!result.ok || !result.data) {
					throw new Error(result.message || "Falha ao carregar cidades.");
				}

				if (!canceled) {
					setCidades(result.data);
				}
			} catch (err) {
				if (!canceled) {
					setCidades([]);
					setError(err instanceof Error ? err.message : "Falha ao carregar cidades.");
				}
			} finally {
				if (!canceled) {
					setLoadingCidades(false);
				}
			}
		};

		void loadCidades();

		return () => {
			canceled = true;
		};
	}, [estado]);

	useEffect(() => {
		if (step !== "bigfive" || bigFiveQuestionario || loadingBigFiveQuestionario) {
			return;
		}

		let canceled = false;

		const loadQuestionario = async () => {
			setLoadingBigFiveQuestionario(true);
			setBigFiveQuestionarioError("");

			try {
				const result = await carregarQuestionarioBigFiveAction();
				if (!result.ok) {
					throw new Error(result.message || "Falha ao carregar questionario Big Five.");
				}

				const normalized = normalizeBigFiveQuestionario(result.data);
				if (!normalized) {
					throw new Error("Questionario Big Five retornou em formato invalido.");
				}

				if (!canceled) {
					setBigFiveQuestionario(normalized);
				}
			} catch (err) {
				if (!canceled) {
					setBigFiveQuestionarioError(err instanceof Error ? err.message : "Falha ao carregar questionario Big Five.");
				}
			} finally {
				if (!canceled) {
					setLoadingBigFiveQuestionario(false);
				}
			}
		};

		void loadQuestionario();

		return () => {
			canceled = true;
		};
	}, [step, bigFiveQuestionario, loadingBigFiveQuestionario]);

	useEffect(() => {
		if (telefoneBigFive.trim()) {
			return;
		}

		const telefoneBase = store.telefone || participante?.contatoOpcional || participante?.telefone || "";
		if (telefoneBase.trim()) {
			setTelefoneBigFive(telefoneBase.trim());
		}
	}, [store.telefone, participante?.contatoOpcional, participante?.telefone, telefoneBigFive]);

	async function validarJornadaSelecionada(telefone: string, rawParticipanteId?: string) {
		const participanteId = rawParticipanteId?.trim() || participante?.id?.trim();
		const useParticipanteId = Boolean(participanteId && isValidUuid(participanteId));

		const result = await precheckJornada({
			campanhaId,
			telefone: useParticipanteId ? undefined : telefone,
			participanteId: useParticipanteId ? (participanteId as string) : undefined,
		});

		if (!result.ok) {
			if (result.status === 404) {
				setCampanhaId("");
				dispatch({ type: "setCampanhaSelecionada", payload: "" });
				setParticipante(null);
				setStep("identificacao");
				dispatch({ type: "setEtapaAtual", payload: "identificacao" });
				throw new Error(INVALID_CAMPAIGN_MESSAGE);
			}

			throw new Error(result.message || "Falha ao validar jornada da campanha.");
		}

		return result.data;
	}

	function readEtapaAtual(precheck: unknown, proximoPasso?: unknown) {
		const normalized = normalizeJornadaState({
			precheck,
			proximoPasso,
			fallback: {
				etapaAtual: "SENSO_POPULACIONAL",
			},
		});

		return normalized.etapaAtual;
	}

	async function handleBuscarParticipante() {
		if (!selectedCampanha || !isValidUuid(selectedCampanha.id)) {
			setError(SELECT_CAMPAIGN_MESSAGE);
			return;
		}

		setSubmitting(true);
		setError("");

		try {
			const telefone = sanitizeTelefone(telefoneBusca);
			if (!isValidTelefone(telefone)) throw new Error("Informe um telefone valido apenas com numeros (10 a 15 digitos).");

			dispatch({ type: "setTelefone", payload: telefone });

			const response = await buscarParticipantePorContato(telefone);
			if (!response.ok) {
				if (response.status === 404) {
					setConfirmModalOpen(false);
					setCreateModalOpen(true);
					setError(PARTICIPANTE_NOT_FOUND_MESSAGE);
					return;
				}

				throw new Error(response.message || "Falha ao consultar participante.");
			}
			const data = response.data;

			const lookup = readParticipantLookup(data);
			if (!lookup.found) {
				setConfirmModalOpen(false);
				setCreateModalOpen(true);
				setError(PARTICIPANTE_NOT_FOUND_MESSAGE);
				return;
			}

			const precheck = await validarJornadaSelecionada(telefone);
			const participanteNormalizado = normalizeParticipant(lookup.participante);
			const participanteAtual: Participante = {
				id: participanteNormalizado?.id,
				nome: participanteNormalizado?.nome ?? "Participante identificado",
				email: participanteNormalizado?.email,
				telefone: participanteNormalizado?.telefone ?? telefone,
				contatoOpcional: participanteNormalizado?.contatoOpcional ?? telefone,
			};

			setParticipante(participanteAtual);
			dispatch({ type: "setParticipanteId", payload: participanteAtual.id ?? "" });
			setConfirmModalOpen(false);
			const normalized = applyJornadaHydration({ precheck });
			setFeedback(normalized.mensagem || defaultMessageByEtapa(normalized.etapaAtual));
			pushToast("Participante confirmado com sucesso.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Falha ao consultar participante.");
			pushToast(err instanceof Error ? err.message : "Falha ao consultar participante.", "error");
		} finally {
			setSubmitting(false);
		}
	}

	async function handleCriarParticipante() {
		if (!selectedCampanha || !isValidUuid(selectedCampanha.id)) {
			setError(SELECT_CAMPAIGN_MESSAGE);
			return;
		}

		setSubmitting(true);
		setError("");

		try {
			const telefone = sanitizeTelefone(telefoneBusca);
			if (!isValidTelefone(telefone)) throw new Error("Informe um telefone valido apenas com numeros (10 a 15 digitos).");

			dispatch({ type: "setTelefone", payload: telefone });

			const response = await criarParticipante({
				nome: nomeNovoParticipante.trim(),
				email: emailNovoParticipante.trim() || undefined,
				contatoOpcional: telefone,
			});
			if (!response.ok) throw new Error(response.message || "Falha ao criar participante.");
			const data = response.data;

			const participanteNormalizado = normalizeParticipant(data);
			const participanteAtual: Participante = {
				id: participanteNormalizado?.id,
				nome: participanteNormalizado?.nome ?? nomeNovoParticipante.trim(),
				email: participanteNormalizado?.email ?? (emailNovoParticipante.trim() || undefined),
				telefone: participanteNormalizado?.telefone ?? telefone,
				contatoOpcional: participanteNormalizado?.contatoOpcional ?? telefone,
			};

			setParticipante(participanteAtual);
			dispatch({ type: "setParticipanteId", payload: participanteAtual.id ?? "" });
			const precheck = await validarJornadaSelecionada(telefone, participanteAtual.id);

			setConfirmModalOpen(false);
			setCreateModalOpen(false);
			const normalized = applyJornadaHydration({ precheck });
			setFeedback(normalized.mensagem || defaultMessageByEtapa(normalized.etapaAtual));
			pushToast("Participante confirmado com sucesso.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Falha ao criar participante.");
			pushToast(err instanceof Error ? err.message : "Falha ao criar participante.", "error");
		} finally {
			setSubmitting(false);
		}
	}

	async function handleEnviarSenso() {
		console.log("[SENSO] Clique no botao Enviar Senso", {
			step,
			submitting,
			campanhaId: selectedCampanha?.id,
			participanteId: store.participanteId,
			questionarioId: store.questionarioSensoId || selectedCampanha?.questionarioId,
		});

		if (!selectedCampanha) return;
		if (!store.participanteId || !isValidUuid(store.participanteId)) {
			console.warn("[SENSO] Bloqueado: participanteId invalido", {
				participanteId: store.participanteId,
			});
			setError("Participante nao identificado para esta jornada.");
			return;
		}
		if (!selectedCampanha.questionarioId) {
			console.warn("[SENSO] Bloqueado: campanha sem questionario", {
				campanhaId: selectedCampanha.id,
				questionarioId: selectedCampanha.questionarioId,
			});
			setError("A campanha selecionada nao possui questionario valido associado.");
			return;
		}
		if (!estado.trim()) {
			setError("Selecione um estado antes de enviar o senso.");
			return;
		}
		if (!cidade.trim()) {
			setError("Selecione uma cidade antes de enviar o senso.");
			return;
		}
		if (!bairro.trim()) {
			setError("Informe um bairro antes de enviar o senso.");
			return;
		}

		setSubmitting(true);
		setError("");

		try {
			console.log("[SENSO] Inicio do envio", {
				campanhaId: selectedCampanha.id,
				participanteId: store.participanteId,
			});

			if (!questionarioBase?.perguntas.length) throw new Error("Questionario do senso indisponivel.");

			const respostas = questionarioBase.perguntas.map((pergunta) => ({
				perguntaId: pergunta.id,
				opcaoId: respostasSenso[pergunta.id] ?? "",
			}));

			console.log("[SENSO] Respostas montadas", {
				totalPerguntas: questionarioBase.perguntas.length,
				totalRespostas: respostas.length,
				respostas,
			});

			if (respostas.some((item) => !item.opcaoId)) {
				console.warn("[SENSO] Bloqueado: perguntas obrigatorias sem resposta");
				throw new Error("Responda todas as perguntas obrigatorias do senso.");
			}

			const payload = {
				participanteId: store.participanteId,
				questionarioId: store.questionarioSensoId || selectedCampanha.questionarioId,
				campanhaId: selectedCampanha.id,
				estado: estado.trim(),
				cidade: cidade.trim(),
				bairro: bairro.trim(),
				respostas,
			};

			console.log("[SENSO] Payload pronto para envio", payload);

			const response = await enviarSenso({
				...payload,
			});

			console.log("[SENSO] Resposta da API de envio", response);

			if (!response.ok) throw new Error(response.message || "Falha ao responder senso populacional.");

			if (response.status === 202) {
				console.log("[SENSO] Em fila (202), aguardando processamento");
				setProcessingSenso(true);
				setFeedback("Senso recebido para processamento em fila. Aguarde para avancar ao Big Five.");
				pushToast("Senso em processamento (fila).");
				return;
			}

			console.log("[SENSO] Executando precheck pos-envio");
			const responsePayload = readObject(response.data);
			const proximoPasso = readObject(responsePayload?.proximoPasso);

			const precheckPosSenso = await validarJornadaSelecionada(
				store.telefone || participante?.contatoOpcional || participante?.telefone || "",
				store.participanteId,
			);
			const etapaPosSenso = readEtapaAtual(precheckPosSenso, proximoPasso);
			console.log("[SENSO] Resultado precheck pos-envio", {
				precheckPosSenso,
				etapaPosSenso,
			});

			const normalized = applyJornadaHydration({
				precheck: precheckPosSenso,
				proximoPasso,
			});

			if (normalized.etapaAtual === "JORNADA_CONCLUIDA") {
				console.log("[SENSO] Jornada concluida apos envio do senso");
				setProcessingSenso(false);
				setFeedback(normalized.mensagem || CONCLUIDA_STEP_MESSAGE);
				pushToast("Jornada ja concluida para este participante.");
				return;
			}

			if (normalized.etapaAtual !== "BIGFIVE") {
				console.log("[SENSO] Etapa ainda nao liberou BigFive", { etapaPosSenso });
				setProcessingSenso(true);
				setFeedback(normalized.mensagem || "Senso recebido para processamento em fila. Aguarde para avancar ao Big Five.");
				pushToast("Senso em processamento (aguardando confirmacao de etapa).");
				return;
			}

			console.log("[SENSO] BigFive liberado, avancando fluxo");
			setProcessingSenso(false);
			setFeedback(normalized.mensagem || "Senso populacional enviado e associado ao telefone informado. Agora preencha o Big Five.");
			pushToast("Senso concluido com sucesso.");
		} catch (err) {
			console.error("[SENSO] Erro no envio", err);
			setError(err instanceof Error ? err.message : "Erro ao enviar senso.");
			pushToast(err instanceof Error ? err.message : "Erro ao enviar senso.", "error");
		} finally {
			console.log("[SENSO] Fim da execucao handleEnviarSenso", {
				submittingFinal: false,
				stepFinal: step,
				processingSensoFinal: processingSenso,
			});
			setSubmitting(false);
		}
	}

	async function handleEnviarBigFive() {
		const participanteId = jornadaState.participanteId || store.participanteId;
		const campanhaAtualId = jornadaState.campanhaId || selectedCampanha?.id || campanhaId;

		if (!participanteId.trim() || !campanhaAtualId.trim()) {
			setError("Nao foi possivel identificar participante/campanha da jornada. Reinicie o fluxo e confirme os dados antes de enviar o Big Five.");
			return;
		}

		if (!isValidUuid(participanteId) || !isValidUuid(campanhaAtualId)) {
			setError("Dados da jornada invalidos para envio do Big Five. Reinicie a jornada para sincronizar participante e campanha.");
			return;
		}

		if (jornadaState.podeResponderBigFive === false) {
			setError(jornadaState.mensagem || BIGFIVE_BLOCKED_MESSAGE);
			return;
		}

		setSubmitting(true);
		setError("");

		try {
			const idadeNormalizada = idadeBigFive.trim();
			let idadePayload: number | undefined;
			if (idadeNormalizada) {
				if (!/^\d+$/.test(idadeNormalizada)) {
					throw new Error("Idade do Big Five deve ser um numero inteiro entre 0 e 150.");
				}

				const parsedIdade = Number.parseInt(idadeNormalizada, 10);
				if (parsedIdade < 0 || parsedIdade > 150) {
					throw new Error("Idade do Big Five deve estar entre 0 e 150.");
				}

				idadePayload = parsedIdade;
			}

			const telefonePayload = telefoneBigFive.trim();
			const cidadePayload = cidade.trim();
			const bairroPayload = bairro.trim();
			const estadoPayload = estado.trim();

			const response = await enviarBigFive({
				participanteId,
				campanhaId: campanhaAtualId,
				canal: canalBigFive || undefined,
				idade: idadePayload,
				telefone: telefonePayload || undefined,
				estado: estadoPayload && (cidadePayload || bairroPayload) ? estadoPayload : undefined,
				cidade: cidadePayload || undefined,
				bairro: bairroPayload || undefined,
				...scores,
			});

			if (!response.ok) throw new Error(response.message || "Falha ao enviar BigFive.");

			if (response.status === 202) {
				setFeedback("Big Five recebido para processamento em fila. Aguarde a consolidacao do resultado.");
				pushToast("Big Five em processamento (fila).");
				return;
			}

			applyJornadaHydration({
				bigFiveResultado: response.data,
			});

			prepareNextApplicationWithSuccess("Pesquisa concluida com sucesso. Jornada finalizada e pronta para nova aplicacao.");
			pushToast("Big Five concluido com sucesso.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erro ao enviar BigFive.");
			pushToast(err instanceof Error ? err.message : "Erro ao enviar BigFive.", "error");
		} finally {
			setSubmitting(false);
		}
	}

	function resetWorkflow() {
		setStep("identificacao");
		setParticipante(null);
		clearConfirmationModalFields();
		setCidade("");
		setCidadeId(null);
		setBairro("");
		setCidades([]);
		setRespostasSenso({});
		setScores(DEFAULT_BIGFIVE);
		setCanalBigFive("");
		setIdadeBigFive("");
		setTelefoneBigFive("");
		setProcessingSenso(false);
		setBigFiveQuestionario(null);
		setBigFiveQuestionarioError("");
		dispatch({ type: "reset" });
		setJornadaState(
			normalizeJornadaState({
				fallback: {
					etapaAtual: "SENSO_POPULACIONAL",
				},
			}),
		);
		setFeedback("");
		setError("");
	}

	async function handleCriarCampanha() {
		if (!canManageCampanhas) {
			setError("Seu perfil nao possui permissao para criar campanhas.");
			return;
		}

		setCreatingCampaign(true);
		setError("");

		try {
			const response = await criarCampanha({
				nome: nomeNovaCampanha.trim(),
				descricao: descricaoNovaCampanha.trim() || undefined,
				questionarioId: questionarioNovaCampanhaId,
			});
			if (!response.ok) throw new Error(response.message || "Falha ao criar campanha.");
			const data = response.data;

			const createdCampaign = normalizeCampanha(data);
			await loadBaseData(createdCampaign?.id);
			if (createdCampaign?.id) {
				setCampanhaId(createdCampaign.id);
				setCampanhaGestaoId(createdCampaign.id);
				dispatch({ type: "setCampanhaSelecionada", payload: createdCampaign.id });
			}

			if (createdCampaign) {
				setCampanhas((current) => {
					const nextCampaigns = mergeCampaignCollections(current, [createdCampaign]);
					persistCampaigns(nextCampaigns);
					return nextCampaigns;
				});
			}

			setNomeNovaCampanha("");
			setDescricaoNovaCampanha("");
			setFeedback("Campanha criada com sucesso. Selecione ou continue com a campanha ativa para iniciar a jornada.");
			pushToast("Campanha criada com sucesso.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Falha ao criar campanha.");
			pushToast(err instanceof Error ? err.message : "Falha ao criar campanha.", "error");
		} finally {
			setCreatingCampaign(false);
		}
	}

	async function handleToggleCampanhaAtiva(targetCampanha: WorkflowCampanha, nextAtiva: boolean) {
		if (!canManageCampanhas) {
			setError("Seu perfil nao possui permissao para atualizar campanhas.");
			return;
		}

		const previousCampanhas = campanhas;
		const previousCampanhaId = campanhaId;

		setUpdatingCampaignStatus(true);
		setError("");

		setCampanhas((current) => {
			const nextCampaigns = current.map((item) =>
				item.id === targetCampanha.id
					? {
						...item,
						ativo: nextAtiva,
					}
					: item,
			);
			persistCampaigns(nextCampaigns);
			return nextCampaigns;
		});

		if (!nextAtiva && previousCampanhaId === targetCampanha.id) {
			setCampanhaId("");
			dispatch({ type: "setCampanhaSelecionada", payload: "" });
			resetParticipantJourney();
		}

		try {
			const response = await atualizarCampanha(targetCampanha.id, {
				ativa: nextAtiva,
				nome: targetCampanha.nome,
				descricao: targetCampanha.descricao,
			});

			if (!response.ok) {
				throw new Error(response.message || "Falha ao atualizar status da campanha.");
			}

			if (!nextAtiva) {
				setFeedback("Campanha desativada com sucesso e removida da lista ativa.");
				pushToast("Campanha desativada.");
			} else {
				setFeedback("Campanha ativada com sucesso.");
				pushToast("Campanha ativada.");
			}
		} catch (err) {
			setCampanhas(previousCampanhas);
			persistCampaigns(previousCampanhas);
			setCampanhaId(previousCampanhaId);
			dispatch({ type: "setCampanhaSelecionada", payload: previousCampanhaId });
			setError(err instanceof Error ? err.message : "Falha ao atualizar status da campanha.");
			pushToast(err instanceof Error ? err.message : "Falha ao atualizar status da campanha.", "error");
		} finally {
			setUpdatingCampaignStatus(false);
		}
	}

	async function handleManualReactivateCampaign() {
		const normalizedCampaignId = manualCampaignId.trim();

		if (!canManageCampanhas) {
			setError("Seu perfil nao possui permissao para atualizar campanhas.");
			return;
		}

		if (!normalizedCampaignId) {
			setError("Informe o ID da campanha para reativar manualmente.");
			return;
		}

		setUpdatingCampaignStatus(true);
		setError("");

		try {
			const response = await atualizarCampanha(normalizedCampaignId, { ativa: true });

			if (!response.ok) {
				throw new Error(response.message || "Falha ao ativar campanha pelo ID informado.");
			}

			const normalizedCampaign = normalizeCampanha(response.data);
			if (normalizedCampaign) {
				setCampanhas((current) => {
					const nextCampaigns = mergeCampaignCollections(current, [normalizedCampaign]);
					persistCampaigns(nextCampaigns);
					return nextCampaigns;
				});
				setCampanhaGestaoId(normalizedCampaign.id);
			}

			setManualCampaignId("");
			setFeedback("Campanha ativada com sucesso pelo ID informado.");
			pushToast("Campanha ativada pelo ID.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Falha ao ativar campanha pelo ID informado.");
			pushToast(err instanceof Error ? err.message : "Falha ao ativar campanha pelo ID informado.", "error");
		} finally {
			setUpdatingCampaignStatus(false);
		}
	}

	const campanhasList = campanhasAtivas.map((item) => ({ value: item.id, label: item.nome ?? item.descricao ?? item.id }));
	const campanhasGestaoList = campanhas.map((item) => ({
		value: item.id,
		label: `${item.nome ?? item.descricao ?? item.id} • ${item.ativo ? "Ativa" : "Inativa"}`,
	}));

	if (mode === "campanhas") {
		return (
			<section className="flex flex-1 min-w-0 flex-col p-3 sm:p-6 lg:p-8">
				<div className="min-w-0 rounded-3xl border border-white/10 bg-slate-900/55 p-4 sm:p-6 shadow-2xl shadow-slate-950/40">
					<header className="border-b border-white/10 pb-6">
						<p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-300">AreaShow</p>
						<h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Criar campanha de Senso Populacional</h2>
					</header>
					<div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
						<CampanhaFormCard
							loading={creatingCampaign || loadingBaseData}
							nome={nomeNovaCampanha}
							descricao={descricaoNovaCampanha}
							questionarioId={questionarioNovaCampanhaId}
							onNomeChange={setNomeNovaCampanha}
							onDescricaoChange={setDescricaoNovaCampanha}
							onQuestionarioChange={setQuestionarioNovaCampanhaId}
							onSubmit={() => void handleCriarCampanha()}
							canManageCampanhas={canManageCampanhas}
							questionarios={questionarios}
						/>
						<CampanhaStatusCard
							loading={loadingBaseData || updatingCampaignStatus}
							canManageCampanhas={canManageCampanhas}
							campanhaId={campanhaGestaoId}
							onCampanhaChange={setCampanhaGestaoId}
							campanhas={campanhasGestaoList}
							selectedCampanha={selectedCampanhaGestao}
							manualCampaignId={manualCampaignId}
							onManualCampaignIdChange={setManualCampaignId}
							onToggle={(nextAtiva) => {
								if (selectedCampanhaGestao) {
									void handleToggleCampanhaAtiva(selectedCampanhaGestao, nextAtiva);
								}
							}}
							onManualReactivate={() => {
								void handleManualReactivateCampaign();
							}}
						/>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className="flex flex-1 min-w-0 flex-col p-3 sm:p-6 lg:p-8">
			<div className="min-w-0 rounded-3xl border border-white/10 bg-slate-900/55 p-4 sm:p-6 shadow-2xl shadow-slate-950/40">
				<header className="border-b border-white/10 pb-6">
					<p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-300">AreaShow</p>
					<h2 className="mt-2 text-xl font-black text-white sm:text-3xl">Aplicar Pesquisa de Senso Populacional + Big Five</h2>
				</header>

				{feedback ? <div className="mt-5 rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{feedback}</div> : null}
				{error ? <div className="mt-5 rounded-xl border border-rose-300/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

				<div className="mt-6 space-y-6">
					<div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-5">
						<h3 className="text-lg font-bold text-cyan-100">Estado da jornada (backend)</h3>
						<div className="mt-4 grid gap-4 lg:grid-cols-4">
							<FieldReadonly label="Etapa atual" value={jornadaState.etapaAtual} />
							<FieldReadonly label="Campanha" value={jornadaState.campanhaNome || jornadaState.campanhaId || "Nao informado"} />
							<FieldReadonly label="Participante ID" value={jornadaState.participanteId || "Nao informado"} />
							<FieldReadonly label="Origem do fluxo" value={jornadaState.origem || "Nao informado"} />
						</div>
					</div>

					<div className="rounded-2xl border border-white/10 bg-white/5 p-5">
						<div className="flex flex-wrap items-start justify-between gap-4">
							<h3 className="text-lg font-bold text-white">Campanha da jornada</h3>
						</div>
						<div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
							<FieldSelect label="Campanha" value={campanhaId} onChange={handleCampanhaChange} options={campanhasList} disabled={loadingBaseData || submitting} placeholder="Selecione uma campanha ativa" />
							<FieldReadonly label="URL publica da pesquisa" value={selectedPesquisaPublicaUrl || "URL publica indisponivel para a campanha selecionada"} />
						</div>
					</div>

					<div className="rounded-2xl border border-white/10 bg-white/5 p-5">
						<h3 className="text-lg font-bold text-white">Confirmacao de participante</h3>
						<div className="mt-4 flex flex-wrap items-center gap-3">
							<Button type="button" onClick={() => setConfirmModalOpen(true)} disabled={!canConfirmParticipant} className="h-10 rounded-xl bg-linear-to-r from-cyan-400 to-sky-500 px-4 font-semibold text-slate-950">
								<Search className="size-4" /> Confirmar participante
							</Button>
							{participante ? <div className="rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">Associado: {participante.nome}</div> : <span className="text-sm text-slate-400">Nenhum participante associado.</span>}
						</div>
					</div>

					{step === "senso" ? (
						<div className="rounded-2xl border border-white/10 bg-white/5 p-5">
							<h3 className="text-lg font-bold text-white">Formulario de Senso Populacional</h3>
							<div className="mt-4 grid gap-4 md:grid-cols-2">
								<FieldSelect
									label="Estado"
									value={estado}
									onChange={setEstado}
									options={estados.map((item) => ({ value: item.sigla, label: `${item.sigla} - ${item.nome}` }))}
									disabled={loadingEstados || submitting}
									placeholder={loadingEstados ? "Carregando estados..." : "Selecione o estado"}
								/>
								<FieldSelect
									label="Cidade"
									value={cidadeId ? String(cidadeId) : ""}
									onChange={(value) => {
										const selected = cidades.find((item) => String(item.id) === value);
										setCidadeId(selected?.id ?? null);
										setCidade(selected?.nome ?? "");
									}}
									options={cidades.map((item) => ({ value: String(item.id), label: item.nome }))}
									disabled={loadingCidades || !estado || submitting}
									placeholder={loadingCidades ? "Carregando cidades..." : "Selecione a cidade"}
								/>
								<FieldInput
									label="Bairro"
									value={bairro}
									onChange={(value) => setBairro(value)}
									placeholder="Digite o bairro"
									disabled={submitting}
								/>
							</div>

							<div className="mt-4 space-y-4">
								{questionarioBase?.perguntas.map((pergunta, index) => (
									<div key={pergunta.id} className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
										<p className="text-sm font-semibold text-white">{index + 1}. {pergunta.texto}</p>
										<div className="mt-3 grid gap-2 sm:grid-cols-2">
											{pergunta.opcoes.map((opcao) => (
												<label key={opcao.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
													<input type="radio" name={`pergunta-${pergunta.id}`} checked={respostasSenso[pergunta.id] === opcao.id} onChange={() => setRespostasSenso((prev) => ({ ...prev, [pergunta.id]: opcao.id }))} className="accent-cyan-400" />
													<span>{opcao.texto}</span>
												</label>
											))}
										</div>
									</div>
								))}
							</div>

							{processingSenso ? <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Processamento em fila (202). Aguarde para liberar o Big Five.</div> : null}

							<div className="mt-4">
								<Button type="button" disabled={submitting || !selectedCampanha || !questionarioBase} onClick={() => void handleEnviarSenso()} className="h-10 rounded-xl bg-cyan-500 px-4 font-semibold text-slate-950 hover:bg-cyan-400">Enviar Senso</Button>
							</div>
						</div>
					) : null}

					{step === "bigfive" ? (
						<div className="rounded-2xl border border-white/10 bg-white/5 p-5">
							<h3 className="text-lg font-bold text-white">{bigFiveQuestionario?.titulo || "Formulario Big Five"}</h3>
							{bigFiveQuestionario?.descricao ? <p className="mt-1 text-sm text-slate-300">{bigFiveQuestionario.descricao}</p> : null}
							{isBigFiveBlocked ? <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{jornadaState.mensagem || BIGFIVE_BLOCKED_MESSAGE}</div> : null}
							{loadingBigFiveQuestionario ? <div className="mt-4 rounded-xl border border-cyan-300/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">Carregando perguntas do Big Five...</div> : null}
							{bigFiveQuestionarioError ? <div className="mt-4 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{bigFiveQuestionarioError}</div> : null}
							{!jornadaState.participanteId || !jornadaState.campanhaId ? (
								<div className="mt-4 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
									Dados de participante/campanha ausentes para enviar Big Five. Reinicie a jornada e confirme o participante.
								</div>
							) : null}
							<div className="mt-4 space-y-4">
								<div className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Dados adicionais (opcional)</p>
									<div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
										<FieldSelect
											label="Canal"
											value={canalBigFive}
											onChange={(value) => setCanalBigFive(value as "" | CanalBigFive)}
											options={BIGFIVE_CANAIS.map((item) => ({ value: item, label: item }))}
											disabled={submitting || isBigFiveBlocked || loadingBigFiveQuestionario}
											placeholder="Selecione o canal"
										/>
										<FieldInput
											label="Idade"
											value={idadeBigFive}
											onChange={setIdadeBigFive}
											placeholder="Ex: 35"
											disabled={submitting || isBigFiveBlocked || loadingBigFiveQuestionario}
										/>
										<FieldInput
											label="Telefone"
											value={telefoneBigFive}
											onChange={setTelefoneBigFive}
											placeholder="Ex: 5522999999999"
											disabled={submitting || isBigFiveBlocked || loadingBigFiveQuestionario}
										/>
										<FieldSelect
											label="Estado"
											value={estado}
											onChange={setEstado}
											options={estados.map((item) => ({ value: item.sigla, label: `${item.sigla} - ${item.nome}` }))}
											disabled={loadingEstados || submitting || isBigFiveBlocked || loadingBigFiveQuestionario}
											placeholder={loadingEstados ? "Carregando estados..." : "Selecione o estado"}
										/>
										<FieldSelect
											label="Cidade"
											value={cidadeId ? String(cidadeId) : ""}
											onChange={(value) => {
												const selected = cidades.find((item) => String(item.id) === value);
												setCidadeId(selected?.id ?? null);
												setCidade(selected?.nome ?? "");
											}}
											options={cidades.map((item) => ({ value: String(item.id), label: item.nome }))}
											disabled={loadingCidades || !estado || submitting || isBigFiveBlocked || loadingBigFiveQuestionario}
											placeholder={loadingCidades ? "Carregando cidades..." : "Selecione a cidade"}
										/>
										<FieldInput
											label="Bairro"
											value={bairro}
											onChange={setBairro}
											placeholder="Ex: Centro"
											disabled={submitting || isBigFiveBlocked || loadingBigFiveQuestionario}
										/>
									</div>
								</div>

								{bigFiveQuestionario?.perguntas.map((pergunta) => (
									<div key={pergunta.campo} className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
										{pergunta.fator ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{pergunta.fator}</p> : null}
										<p className="mt-2 text-sm font-semibold text-white">{pergunta.texto}</p>
										<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
											{bigFiveScaleOptions.map((option) => (
												<label key={`${pergunta.campo}-${option.value}`} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
													<input
														type="radio"
														name={`bigfive-${pergunta.campo}`}
														value={option.value}
														disabled={isBigFiveBlocked || loadingBigFiveQuestionario || Boolean(bigFiveQuestionarioError)}
														checked={scores[pergunta.campo] === option.value}
														onChange={() => setScores((prev) => ({ ...prev, [pergunta.campo]: option.value }))}
														className="accent-cyan-400"
													/>
													<span>{option.value} - {option.label}</span>
												</label>
											))}
										</div>
									</div>
								))}
							</div>
							<div className="mt-4">
								<Button type="button" disabled={submitting || shouldBlockBigFiveSubmit || loadingBigFiveQuestionario || !bigFiveQuestionario || Boolean(bigFiveQuestionarioError)} onClick={() => void handleEnviarBigFive()} className="h-10 rounded-xl bg-linear-to-r from-cyan-400 to-violet-500 px-4 font-semibold text-slate-950">Finalizar Big Five</Button>
							</div>
						</div>
					) : null}

					{step === "finalizado" ? (
						<div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-5 text-emerald-100">
							<div className="flex items-center gap-2 text-lg font-bold"><CheckCircle2 className="size-5" /> Jornada concluida</div>
							<p className="mt-1 text-sm text-emerald-50/90">O participante {participante?.nome} finalizou senso populacional e Big Five nesta sessao.</p>
							<Button type="button" onClick={resetWorkflow} className="mt-4 h-10 rounded-xl bg-emerald-400 px-4 font-semibold text-slate-950 hover:bg-emerald-300">Iniciar nova jornada</Button>
						</div>
					) : null}
				</div>
			</div>

			{toasts.length > 0 ? (
				<div className="pointer-events-none fixed left-3 right-3 top-3 z-[140] space-y-2 sm:left-auto sm:right-4 sm:top-4">
					{toasts.map((toast) => (
						<div key={toast.id} className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${toast.tone === "success" ? "border-emerald-300/30 bg-emerald-500/20 text-emerald-50" : "border-rose-300/30 bg-rose-500/20 text-rose-50"}`}>{toast.message}</div>
					))}
				</div>
			) : null}

			<ConfirmarParticipanteModal open={confirmModalOpen} telefone={telefoneBusca} onTelefoneChange={setTelefoneBusca} onClose={() => setConfirmModalOpen(false)} onConfirm={() => void handleBuscarParticipante()} loading={submitting} />
			<CadastrarParticipanteModal open={createModalOpen} telefone={telefoneBusca} nome={nomeNovoParticipante} email={emailNovoParticipante} onNomeChange={setNomeNovoParticipante} onEmailChange={setEmailNovoParticipante} onClose={() => setCreateModalOpen(false)} onConfirm={() => void handleCriarParticipante()} loading={submitting} />
		</section>
	);
}

function FieldInput({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; disabled?: boolean }) {
	return (
		<label className="block text-sm text-slate-300">
			<span className="mb-1 block">{label}</span>
			<input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100 outline-none ring-cyan-400/35 transition focus:ring-2 disabled:opacity-60" />
		</label>
	);
}

function FieldSelect({ label, value, onChange, options, disabled, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; disabled?: boolean; placeholder?: string }) {
	return (
		<label className="block text-sm text-slate-300">
			<span className="mb-1 block">{label}</span>
			<select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100 outline-none ring-cyan-400/35 transition focus:ring-2 disabled:opacity-60">
				<option value="">{placeholder ?? "Selecione uma opcao"}</option>
				{options.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
			</select>
		</label>
	);
}

function FieldReadonly({ label, value }: { label: string; value: string }) {
	return (
		<label className="block text-sm text-slate-300">
			<span className="mb-1 block">{label}</span>
			<div className="flex min-h-11 items-start rounded-xl border border-white/15 bg-slate-950/65 px-3 py-3 text-sm text-slate-100 break-all">{value}</div>
		</label>
	);
}

function CampanhaFormCard({ loading, nome, descricao, questionarioId, onNomeChange, onDescricaoChange, onQuestionarioChange, onSubmit, canManageCampanhas, questionarios }: { loading: boolean; nome: string; descricao: string; questionarioId: string; onNomeChange: (value: string) => void; onDescricaoChange: (value: string) => void; onQuestionarioChange: (value: string) => void; onSubmit: () => void; canManageCampanhas: boolean; questionarios: Questionario[] }) {
	return (
		<div className="rounded-2xl border border-white/10 bg-white/5 p-5">
			<h3 className="text-lg font-bold text-white">Nova campanha</h3>
			<div className="mt-4 grid gap-4">
				<FieldInput label="Nome da campanha" value={nome} onChange={onNomeChange} placeholder="Senso Araruama" />
				<FieldInput label="Descricao" value={descricao} onChange={onDescricaoChange} placeholder="Rodada principal de entrevistas" />
				<FieldSelect label="Questionario" value={questionarioId} onChange={onQuestionarioChange} options={questionarios.map((item) => ({ value: item.id, label: item.nome ?? item.titulo ?? item.id }))} disabled={loading || questionarios.length === 0 || !canManageCampanhas} placeholder="Selecione o questionario" />
			</div>
			<Button type="button" disabled={loading || !canManageCampanhas || !nome.trim() || !questionarioId} onClick={onSubmit} className="mt-4 h-10 rounded-xl bg-linear-to-r from-cyan-400 to-violet-500 px-4 font-semibold text-slate-950"><Plus className="size-4" />{loading ? "Criando campanha..." : "Criar campanha"}</Button>
		</div>
	);
}

function CampanhaStatusCard({ loading, canManageCampanhas, campanhaId, onCampanhaChange, campanhas, selectedCampanha, manualCampaignId, onManualCampaignIdChange, onToggle, onManualReactivate }: { loading: boolean; canManageCampanhas: boolean; campanhaId: string; onCampanhaChange: (value: string) => void; campanhas: Array<{ value: string; label: string }>; selectedCampanha: WorkflowCampanha | null; manualCampaignId: string; onManualCampaignIdChange: (value: string) => void; onToggle: (nextAtiva: boolean) => void; onManualReactivate: () => void }) {
	return (
		<div className="rounded-2xl border border-white/10 bg-white/5 p-5">
			<h3 className="text-lg font-bold text-white">Gerenciar campanhas</h3>
			<p className="mt-1 text-sm text-slate-300">Ative ou desative campanhas de senso e Big Five. Campanhas inativas saem da lista de aplicacao, mas continuam disponiveis aqui para reativacao.</p>
			<div className="mt-4 grid gap-4">
				<FieldSelect
					label="Campanha"
					value={campanhaId}
					onChange={onCampanhaChange}
					options={campanhas}
					disabled={loading || campanhas.length === 0 || !canManageCampanhas}
					placeholder="Selecione uma campanha"
				/>
				<FieldReadonly label="Status atual" value={selectedCampanha ? (selectedCampanha.ativo ? "Ativa" : "Inativa") : "Nenhuma campanha selecionada"} />
				<FieldReadonly label="Questionario vinculado" value={selectedCampanha?.questionarioId || "Nao informado"} />
				<FieldReadonly label="URL publica" value={selectedCampanha?.urlPublica || "URL publica indisponivel"} />
			</div>
			<Button
				type="button"
				disabled={loading || !canManageCampanhas || !selectedCampanha}
				onClick={() => onToggle(!(selectedCampanha?.ativo !== false))}
				className="mt-4 h-10 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 font-semibold text-amber-100 hover:bg-amber-400/20 disabled:opacity-60"
			>
				{loading ? "Atualizando campanha..." : selectedCampanha?.ativo !== false ? "Desativar campanha" : "Ativar campanha"}
			</Button>
			<div className="mt-5 rounded-xl border border-white/10 bg-slate-950/35 p-4">
				<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Fallback manual</p>
				<p className="mt-2 text-sm text-slate-300">Se a campanha desativada nao vier na listagem, informe o ID dela para reativar manualmente.</p>
				<div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
					<FieldInput label="ID da campanha" value={manualCampaignId} onChange={onManualCampaignIdChange} placeholder="Cole aqui o UUID da campanha" disabled={loading || !canManageCampanhas} />
					<div className="flex items-end">
						<Button
							type="button"
							disabled={loading || !canManageCampanhas || !manualCampaignId.trim()}
							onClick={onManualReactivate}
							className="h-11 rounded-xl bg-linear-to-r from-cyan-400 to-violet-500 px-4 font-semibold text-slate-950 disabled:opacity-60"
						>
							{loading ? "Ativando..." : "Ativar por ID"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

function ConfirmarParticipanteModal({ open, telefone, onTelefoneChange, onClose, onConfirm, loading }: { open: boolean; telefone: string; onTelefoneChange: (value: string) => void; onClose: () => void; onConfirm: () => void; loading: boolean }) {
	if (!open) return null;
	return (
		<div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
			<div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl shadow-slate-950/70">
				<h3 className="text-lg font-black text-white">Confirmar participante</h3>
				<label className="mt-4 block text-sm text-slate-300">
					<span className="mb-1 block">Telefone</span>
					<input value={telefone} onChange={(e) => onTelefoneChange(e.target.value)} placeholder="55999999999" className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100 outline-none ring-cyan-400/35 transition focus:ring-2" />
				</label>
				<div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
					<Button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-slate-200 hover:bg-white/10">Cancelar</Button>
					<Button type="button" disabled={!telefone.trim() || loading} onClick={onConfirm} className="h-10 rounded-xl bg-cyan-500 px-4 text-slate-950 hover:bg-cyan-400">{loading ? "Consultando..." : "Confirmar"}</Button>
				</div>
			</div>
		</div>
	);
}

function CadastrarParticipanteModal({ open, telefone, nome, email, onNomeChange, onEmailChange, onClose, onConfirm, loading }: { open: boolean; telefone: string; nome: string; email: string; onNomeChange: (value: string) => void; onEmailChange: (value: string) => void; onClose: () => void; onConfirm: () => void; loading: boolean }) {
	if (!open) return null;
	return (
		<div className="fixed inset-0 z-[121] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
			<div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl shadow-slate-950/70">
				<h3 className="text-lg font-black text-white">Cadastrar participante</h3>
				<div className="mt-4 rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">Telefone associado: {telefone}</div>
				<div className="mt-4 grid gap-3">
					<FieldInput label="Nome" value={nome} onChange={onNomeChange} placeholder="Nome completo" />
					<FieldInput label="Email (opcional)" value={email} onChange={onEmailChange} placeholder="email@dominio.com" />
				</div>
				<div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
					<Button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-slate-200 hover:bg-white/10">Cancelar</Button>
					<Button type="button" disabled={!nome.trim() || !telefone.trim() || loading} onClick={onConfirm} className="h-10 rounded-xl bg-linear-to-r from-cyan-400 to-violet-500 px-4 text-slate-950"><UserPlus className="size-4" />{loading ? "Cadastrando..." : "Cadastrar e continuar"}</Button>
				</div>
			</div>
		</div>
	);
}


