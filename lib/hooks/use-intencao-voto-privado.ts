"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { buscarOuCriarParticipanteIntencaoVotoPrivadoAction } from "@/app/intencao-voto/actions";
import {
  obterPesquisaIntencaoVotoAction,
  registrarVotoIntencaoVotoPrivadoAction,
} from "@/app/intencao-voto/workflow-actions";
import {
  normalizarParticipanteIntencaoVoto,
  validarParticipanteIntencaoVoto,
} from "@/lib/helpers/normalize-participante-intencao-voto";
import type {
  CanalVoto,
  ParticipanteIntencaoVotoNormalizado,
  PesquisaIntencaoVotoDetalhe,
} from "@/types/intencao-voto";

type LoadState = "idle" | "validating" | "submitting" | "queued" | "success" | "error";

type LocalizacaoPayload = {
  estado: string;
  cidade: string;
  bairro: string;
};

type VotoPayload = {
  candidatoId: string;
  idade: number;
  canal: CanalVoto;
};

export function useIntencaoVotoPrivado({ pesquisaId }: { pesquisaId: string }) {
  const [pesquisa, setPesquisa] = useState<PesquisaIntencaoVotoDetalhe | null>(null);
  const [pesquisaLoading, setPesquisaLoading] = useState(true);
  const [pesquisaError, setPesquisaError] = useState<string | null>(null);

  const [participante, setParticipante] = useState<ParticipanteIntencaoVotoNormalizado | null>(null);
  const [participanteLoading, setParticipanteLoading] = useState(false);
  const [participanteError, setParticipanteError] = useState<string | null>(null);

  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!pesquisaId) {
      setPesquisa(null);
      setPesquisaError(null);
      setPesquisaLoading(false);
      return () => {
        mounted = false;
      };
    }

    const loadPesquisa = async () => {
      setPesquisaLoading(true);
      setPesquisaError(null);

      try {
        const result = await obterPesquisaIntencaoVotoAction(pesquisaId);
        if (!mounted) {
          return;
        }

        if (!result.ok || !result.data) {
          setPesquisaError(result.message || "Erro ao carregar pesquisa.");
          return;
        }

        setPesquisa(result.data);
      } catch {
        if (mounted) {
          setPesquisaError("Erro inesperado ao carregar pesquisa.");
        }
      } finally {
        if (mounted) {
          setPesquisaLoading(false);
        }
      }
    };

    void loadPesquisa();

    return () => {
      mounted = false;
    };
  }, [pesquisaId]);

  const buscarOuCriarParticipante = useCallback(async (contato: string, nome?: string, email?: string) => {
    setParticipanteLoading(true);
    setParticipanteError(null);

    try {
      const result = await buscarOuCriarParticipanteIntencaoVotoPrivadoAction({ contato, nome, email });
      if (!result.ok || !result.data) {
        setParticipanteError(result.message || "Falha ao identificar participante.");
        return;
      }

      const normalized = normalizarParticipanteIntencaoVoto(result.data);
      if (!normalized) {
        setParticipanteError("Nao foi possivel normalizar o participante retornado.");
        return;
      }

      setParticipante(normalized);
    } catch {
      setParticipanteError("Erro inesperado ao identificar participante.");
    } finally {
      setParticipanteLoading(false);
    }
  }, []);

  const votar = useCallback(
    async (localizacao: LocalizacaoPayload, voto: VotoPayload) => {
      if (!pesquisa?.id) {
        setError("Pesquisa nao carregada.");
        return "error" as const;
      }

      if (!participante || !validarParticipanteIntencaoVoto(participante)) {
        setError("Participante nao identificado.");
        return "error" as const;
      }

      if (!participante.contato) {
        setError("O participante precisa ter telefone ou contato cadastrado.");
        return "error" as const;
      }

      if (!localizacao.estado || !localizacao.cidade || !localizacao.bairro) {
        setError("Localizacao incompleta.");
        return "error" as const;
      }

      if (!voto.candidatoId || !voto.idade || voto.idade <= 0) {
        setError("Selecione o candidato e informe a idade do participante.");
        return "error" as const;
      }

      setState("submitting");
      setError(null);

      try {
        const result = await registrarVotoIntencaoVotoPrivadoAction({
          participanteId: participante.id,
          telefone: participante.contato,
          pesquisaId: pesquisa.id,
          candidatoId: voto.candidatoId,
          canal: voto.canal,
          idade: voto.idade,
          estado: localizacao.estado.trim(),
          cidade: localizacao.cidade.trim(),
          bairro: localizacao.bairro.trim(),
        });

        if (!result.ok) {
          setState("error");
          setError(result.message || "Falha ao registrar voto.");
          return "error" as const;
        }

        if (result.status === 202) {
          setState("queued");
          return "queued" as const;
        }

        setState("success");
        return "success" as const;
      } catch {
        setState("error");
        setError("Erro inesperado ao registrar voto.");
        return "error" as const;
      }
    },
    [participante, pesquisa?.id],
  );

  const limpar = useCallback(() => {
    setParticipante(null);
    setParticipanteError(null);
    setState("idle");
    setError(null);
  }, []);

  const contexto = useMemo(
    () => ({ state, error, isProcessing: state === "submitting" || state === "queued" }),
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
    buscarOuCriarParticipante,
    votar,
    limpar,
  };
}
