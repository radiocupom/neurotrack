"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { identificarParticipanteIntencaoVotoPublicoAction } from "@/app/intencao-voto/actions";
import {
  obterPesquisaIntencaoVotoPublicaAction,
  registrarVotoIntencaoVotoPublicoAction,
} from "@/app/intencao-voto/workflow-actions";
import { normalizarParticipanteIntencaoVoto } from "@/lib/helpers/normalize-participante-intencao-voto";
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

type IdentificacaoPayload = {
  telefone: string;
  nome?: string;
  email?: string;
};

type VotoPayload = {
  candidatoId: string;
  idade: number;
  canal: CanalVoto;
};

export function useIntencaoVotoPublico({ pesquisaId }: { pesquisaId: string }) {
  const [pesquisa, setPesquisa] = useState<PesquisaIntencaoVotoDetalhe | null>(null);
  const [pesquisaLoading, setPesquisaLoading] = useState(true);
  const [pesquisaError, setPesquisaError] = useState<string | null>(null);

  const [participante, setParticipante] = useState<ParticipanteIntencaoVotoNormalizado | null>(null);
  const [identificacao, setIdentificacao] = useState<IdentificacaoPayload | null>(null);
  const [participanteLoading, setParticipanteLoading] = useState(false);
  const [participanteError, setParticipanteError] = useState<string | null>(null);

  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadPesquisa = async () => {
      setPesquisaLoading(true);
      setPesquisaError(null);

      try {
        const result = await obterPesquisaIntencaoVotoPublicaAction(pesquisaId);
        if (!mounted) {
          return;
        }

        if (!result.ok || !result.data) {
          setPesquisaError(result.message || "Erro ao carregar pesquisa publica.");
          return;
        }

        setPesquisa(result.data);
      } catch {
        if (mounted) {
          setPesquisaError("Erro inesperado ao carregar pesquisa publica.");
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

  const identificarParticipante = useCallback(async (payload: IdentificacaoPayload) => {
    setParticipanteLoading(true);
    setParticipanteError(null);

    try {
      const result = await identificarParticipanteIntencaoVotoPublicoAction(payload.telefone);
      if (!result.ok || !result.data) {
        setParticipanteError(result.message || "Participante nao cadastrado.");
        return;
      }

      const normalized = normalizarParticipanteIntencaoVoto(result.data);
      if (!normalized) {
        setParticipanteError("Nao foi possivel validar o participante retornado.");
        return;
      }

      setParticipante(normalized);
      setIdentificacao(payload);
    } catch {
      setParticipanteError("Erro inesperado ao validar participante.");
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

      if (!participante || !identificacao?.telefone) {
        setError("Valide o participante antes de continuar.");
        return "error" as const;
      }

      if (!voto.candidatoId || !voto.idade || voto.idade <= 0) {
        setError("Selecione o candidato e informe a idade.");
        return "error" as const;
      }

      setState("submitting");
      setError(null);

      try {
        const result = await registrarVotoIntencaoVotoPublicoAction(pesquisa.id, {
          telefone: identificacao.telefone.trim(),
          nome: identificacao.nome?.trim() || participante.nome,
          email: identificacao.email?.trim() || participante.email || undefined,
          estado: localizacao.estado.trim(),
          cidade: localizacao.cidade.trim(),
          bairro: localizacao.bairro.trim(),
          idade: voto.idade,
          candidatoId: voto.candidatoId,
          canal: voto.canal,
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
    [identificacao, participante, pesquisa?.id],
  );

  const limpar = useCallback(() => {
    setParticipante(null);
    setIdentificacao(null);
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
    identificarParticipante,
    votar,
    limpar,
  };
}
