/**
 * Hook para Fluxo Público de Pesquisa de Opinião
 * Usuário sem autenticação respondendo pesquisa
 *
 * Fluxo:
 * 1. Carrega pesquisa pública
 * 2. Identifica/cria participante por telefone
 * 3. Coleta respostas do formulário
 * 4. Envia respostas
 * 5. Trata resposta (sucesso, fila, bloqueio por IP, erro)
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  identificarParticipanteOpiniaoPublico,
  obterPesquisaOpiniao,
  responderPesquisaOpiniaoPublica,
} from "@/app/pesquisa-opiniao/workflow-actions";
import {
  normalizarParticipante,
  validarParticipante,
  validarTelefoneBrasileiro,
} from "@/lib/helpers/normalize-participante-opiniao";
import type {
  ContextoResponder,
  LoadState,
  ParticipanteNormalizado,
  PayloadResponderPublico,
  PesquisaDetalhe,
  RespostaUsuario,
} from "@/types/pesquisa-opiniao";

interface UsePesquisaOpiniaoPublicoParams {
  pesquisaId: string;
}

interface UsePesquisaOpiniaoPublicoState {
  // Pesquisa
  pesquisa: PesquisaDetalhe | null;
  pesquisaLoading: boolean;
  pesquisaError: string | null;

  // Participante
  participante: ParticipanteNormalizado | null;
  participanteLoading: boolean;
  participanteError: string | null;

  // Responder
  contexto: ContextoResponder;
  temRespostas: boolean;

  // Ações
  identificarParticipante: (telefone: string, nome?: string, email?: string) => Promise<void>;
  responder: (localizacao: {
    estado: string;
    cidade: string;
    bairro: string;
  }, respostas: RespostaUsuario[], metadata?: {
    canal?: "WHATSAPP" | "TELEFONE" | "PRESENCIAL" | "OUTRO";
    idade?: number;
    telefone?: string;
  }) => Promise<LoadState>;
  limpar: () => void;
}

export function usePesquisaOpiniaoPublico({
  pesquisaId,
}: UsePesquisaOpiniaoPublicoParams): UsePesquisaOpiniaoPublicoState {
  // Estado - Pesquisa
  const [pesquisa, setPesquisa] = useState<PesquisaDetalhe | null>(null);
  const [pesquisaLoading, setPesquisaLoading] = useState(true);
  const [pesquisaError, setPesquisaError] = useState<string | null>(null);

  // Estado - Participante
  const [participante, setParticipante] = useState<ParticipanteNormalizado | null>(null);
  const [participanteLoading, setParticipanteLoading] = useState(false);
  const [participanteError, setParticipanteError] = useState<string | null>(null);

  // Estado - Responder
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [temRespostas, setTemRespostas] = useState(false);

  // ========================================================================
  // CARREGAR PESQUISA
  // ========================================================================

  useEffect(() => {
    let isMounted = true;

    const carregarPesquisa = async () => {
      setPesquisaLoading(true);
      setPesquisaError(null);

      try {
        const resultado = await obterPesquisaOpiniao(pesquisaId);

        if (!isMounted) return;

        if (!resultado.ok || !resultado.data) {
          setPesquisaError(resultado.message || "Erro ao carregar pesquisa.");
          return;
        }

        setPesquisa(resultado.data);
      } catch {
        if (!isMounted) return;
        setPesquisaError("Erro inesperado ao carregar pesquisa.");
      } finally {
        if (isMounted) {
          setPesquisaLoading(false);
        }
      }
    };

    carregarPesquisa();

    return () => {
      isMounted = false;
    };
  }, [pesquisaId]);

  // ========================================================================
  // IDENTIFICAR PARTICIPANTE
  // ========================================================================

  const identificarParticipante = useCallback(
    async (telefone: string, nome?: string, email?: string) => {
      setParticipanteLoading(true);
      setParticipanteError(null);

      try {
        // Validar telefone
        if (!validarTelefoneBrasileiro(telefone)) {
          setParticipanteError("Telefone inválido. Use formato com DDD (ex: 11999999999).");
          setParticipanteLoading(false);
          return;
        }

        // Nome é obrigatório no modo público
        if (!nome || !nome.trim()) {
          setParticipanteError("Nome é obrigatório.");
          setParticipanteLoading(false);
          return;
        }

        const resultado = await identificarParticipanteOpiniaoPublico({
          telefone: telefone.trim(),
          nome: nome.trim(),
          email: email?.trim(),
        });

        if (!resultado.ok || !resultado.data) {
          setParticipanteError(resultado.message || "Erro ao identificar participante.");
          return;
        }

        const normalizado = normalizarParticipante(resultado.data);
        if (normalizado) {
          setParticipante(normalizado);
        } else {
          setParticipanteError("Erro ao processar dados do participante.");
        }
      } catch {
        setParticipanteError("Erro inesperado ao identificar participante.");
      } finally {
        setParticipanteLoading(false);
      }
    },
    [],
  );

  // ========================================================================
  // RESPONDER PESQUISA
  // ========================================================================

  const responder = useCallback(
    async (
      localizacao: {
        estado: string;
        cidade: string;
        bairro: string;
      },
      respostas: RespostaUsuario[],
      metadata?: {
        canal?: "WHATSAPP" | "TELEFONE" | "PRESENCIAL" | "OUTRO";
        idade?: number;
        telefone?: string;
      },
    ) => {
      // Validações básicas
      if (!participante || !validarParticipante(participante)) {
        setError("Identifique-se antes de responder a pesquisa.");
        return "error";
      }

      if (!pesquisa?.id) {
        setError("Pesquisa não carregada.");
        return "error";
      }

      if (!localizacao.estado || !localizacao.cidade || !localizacao.bairro) {
        setError("Localização incompleta.");
        return "error";
      }

      if (respostas.length === 0) {
        setError("Nenhuma resposta fornecida.");
        return "error";
      }

      if (
        metadata?.idade != null &&
        (!Number.isInteger(metadata.idade) || metadata.idade < 0 || metadata.idade > 150)
      ) {
        setError("Idade invalida. Informe um valor inteiro entre 0 e 150.");
        return "error";
      }

      setState("validating");
      setError(null);

      try {
        setState("submitting");

        const payload: PayloadResponderPublico = {
          telefone: metadata?.telefone?.trim() || participante.contato || "",
          nome: participante.nome,
          email: participante.email || undefined,
          estado: localizacao.estado.trim(),
          cidade: localizacao.cidade.trim(),
          bairro: localizacao.bairro.trim(),
          canal: metadata?.canal,
          idade: metadata?.idade,
          respostas,
        };

        const resultado = await responderPesquisaOpiniaoPublica(pesquisa.id, payload);

        if (resultado.status === 202) {
          // Resposta enfileirada
          setState("queued");
          setTemRespostas(true);
          return "queued";
        }

        if (!resultado.ok) {
          setError(resultado.message || "Erro ao registrar resposta.");
          setState("error");
          return "error";
        }

        setState("success");
        setTemRespostas(true);
        return "success";
      } catch {
        setError("Erro inesperado ao registrar resposta.");
        setState("error");
        return "error";
      }
    },
    [participante, pesquisa?.id],
  );

  // ========================================================================
  // LIMPEZA
  // ========================================================================

  const limpar = useCallback(() => {
    setParticipante(null);
    setParticipanteError(null);
    setState("idle");
    setError(null);
    setTemRespostas(false);
  }, []);

  // ========================================================================
  // RETORNO
  // ========================================================================

  const contexto = useMemo<ContextoResponder>(
    () => ({
      state,
      error,
      isProcessing: state === "submitting" || state === "queued",
    }),
    [state, error],
  );

  return {
    pesquisa,
    pesquisaLoading,
    pesquisaError,
    participante,
    participanteLoading,
    participanteError,
    contexto,
    temRespostas,
    identificarParticipante,
    responder,
    limpar,
  };
}
