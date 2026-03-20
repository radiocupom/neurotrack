/**
 * Hook para Fluxo Privado de Pesquisa de Opinião
 * Entrevistador logado respondendo pesquisa em nome do participante
 *
 * Fluxo:
 * 1. Carrega pesquisa
 * 2. Busca/cria participante por contato
 * 3. Coleta respostas do formulário
 * 4. Envia respostas
 * 5. Trata resposta (sucesso, fila, erro)
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buscarParticipanteOpiniaoPorContato,
  criarParticipanteOpiniao,
  obterPesquisaOpiniao,
  responderPesquisaOpiniaoPrivada,
} from "@/service/pesquisa-opiniao-workflow.service";
import {
  normalizarParticipante,
  validarParticipante,
} from "@/lib/helpers/normalize-participante-opiniao";
import type {
  ContextoResponder,
  LoadState,
  ParticipanteNormalizado,
  PayloadResponderPrivado,
  PesquisaDetalhe,
  RespostaUsuario,
} from "@/types/pesquisa-opiniao";

interface UsePesquisaOpiniaoPrivadoParams {
  pesquisaId: string;
}

interface UsePesquisaOpiniaoPrivadoState {
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
  buscarOuCriarParticipante: (contato: string, nome?: string, email?: string) => Promise<void>;
  responder: (localizacao: {
    estado: string;
    cidade: string;
    bairro: string;
    latitude?: number;
    longitude?: number;
  }, respostas: RespostaUsuario[]) => Promise<LoadState>;
  limpar: () => void;
}

export function usePesquisaOpiniaoPrivado({
  pesquisaId,
}: UsePesquisaOpiniaoPrivadoParams): UsePesquisaOpiniaoPrivadoState {
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

    if (!pesquisaId) {
      setPesquisa(null);
      setPesquisaError(null);
      setPesquisaLoading(false);
      return () => {
        isMounted = false;
      };
    }

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

        setPesquisa({
          ...resultado.data,
          perguntas: Array.isArray(resultado.data.perguntas) ? resultado.data.perguntas : [],
        });
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
  // BUSCAR OU CRIAR PARTICIPANTE
  // ========================================================================

  const buscarOuCriarParticipante = useCallback(
    async (contato: string, nome?: string, email?: string) => {
      setParticipanteLoading(true);
      setParticipanteError(null);

      try {
        // Tentar buscar primeiro
        const resultadoBusca = await buscarParticipanteOpiniaoPorContato(contato);

        if (resultadoBusca.ok && resultadoBusca.data) {
          const normalizado = normalizarParticipante(resultadoBusca.data);
          if (normalizado) {
            setParticipante(normalizado);
            return;
          }
        }

        // Se não encontrou, criar novo
        if (resultadoBusca.status === 404 || !resultadoBusca.ok) {
          if (!nome || !nome.trim()) {
            setParticipanteError("Nome é obrigatório para criar novo participante.");
            return;
          }

          const resultadoCriacao = await criarParticipanteOpiniao({
            nome: nome.trim(),
            email: email?.trim() || undefined,
            contatoOpcional: contato.trim(),
          });

          if (!resultadoCriacao.ok || !resultadoCriacao.data) {
            setParticipanteError(
              resultadoCriacao.message || "Erro ao criar participante.",
            );
            return;
          }

          const normalizado = normalizarParticipante(resultadoCriacao.data);
          if (normalizado) {
            setParticipante(normalizado);
          } else {
            setParticipanteError("Erro ao processar dados do participante criado.");
          }
          return;
        }

        setParticipanteError("Erro ao buscar/criar participante.");
      } catch {
        setParticipanteError("Erro inesperado ao processar participante.");
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
        latitude?: number;
        longitude?: number;
      },
      respostas: RespostaUsuario[],
    ) => {
      // Validações básicas
      if (!participante || !validarParticipante(participante)) {
        setError("Participante não identificado. Busque ou crie um participante primeiro.");
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

      setState("validating");
      setError(null);

      try {
        setState("submitting");

        const payload: PayloadResponderPrivado = {
          participanteId: participante.id,
          pesquisaId: pesquisa.id,
          estado: localizacao.estado.trim(),
          cidade: localizacao.cidade.trim(),
          bairro: localizacao.bairro.trim(),
          latitude: localizacao.latitude,
          longitude: localizacao.longitude,
          respostas,
        };

        const resultado = await responderPesquisaOpiniaoPrivada(payload);

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
    buscarOuCriarParticipante,
    responder,
    limpar,
  };
}
