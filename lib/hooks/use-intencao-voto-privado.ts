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

function maskContato(value?: string | null) {
  const normalized = (value || "").trim();
  if (!normalized) {
    return "";
  }

  if (normalized.length <= 4) {
    return "****";
  }

  return `${normalized.slice(0, 2)}***${normalized.slice(-2)}`;
}

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

    console.info("[intencao-voto][identificacao] iniciando busca/criacao", {
      pesquisaId,
      contato: maskContato(contato),
      hasNome: Boolean(nome?.trim()),
      hasEmail: Boolean(email?.trim()),
    });

    try {
      const result = await buscarOuCriarParticipanteIntencaoVotoPrivadoAction({ contato, pesquisaId, nome, email });
      console.info("[intencao-voto][identificacao] resposta da action", {
        pesquisaId,
        ok: result.ok,
        status: result.status,
        message: result.message,
        hasData: Boolean(result.data),
      });

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
      console.info("[intencao-voto][identificacao] participante pronto para fluxo", {
        pesquisaId,
        participanteId: normalized.id,
        contato: maskContato(normalized.contato),
      });
    } catch {
      console.error("[intencao-voto][identificacao] erro inesperado");
      setParticipanteError("Erro inesperado ao identificar participante.");
    } finally {
      setParticipanteLoading(false);
    }
  }, [pesquisaId]);

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

      console.info("[intencao-voto][voto] enviando voto", {
        pesquisaId: pesquisa.id,
        participanteId: participante.id,
        candidatoId: voto.candidatoId,
        canal: voto.canal,
        idade: voto.idade,
        estado: localizacao.estado,
        cidade: localizacao.cidade,
        bairro: localizacao.bairro,
      });

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

        console.info("[intencao-voto][voto] resposta da action", {
          pesquisaId: pesquisa.id,
          participanteId: participante.id,
          ok: result.ok,
          status: result.status,
          message: result.message,
        });

        if (!result.ok) {
          const msg = (result.message || "").toLowerCase();
          const isAlreadyVoted =
            result.status === 409 ||
            msg.includes("já votou") ||
            msg.includes("ja votou") ||
            msg.includes("já respondeu") ||
            msg.includes("ja respondeu") ||
            msg.includes("uma vez por pesquisa");

          setState("error");
          setError(
            isAlreadyVoted
              ? "Este participante já votou nesta pesquisa. Não é possível votar novamente."
              : result.message || "Falha ao registrar voto.",
          );
          if (isAlreadyVoted) {
            console.warn("[intencao-voto][voto] bloqueado por voto duplicado", {
              pesquisaId: pesquisa.id,
              participanteId: participante.id,
              status: result.status,
              message: result.message,
            });
          }
          return isAlreadyVoted ? ("already-voted" as const) : ("error" as const);
        }

        if (result.status === 202) {
          setState("queued");
          console.info("[intencao-voto][voto] voto enfileirado", {
            pesquisaId: pesquisa.id,
            participanteId: participante.id,
          });
          return "queued" as const;
        }

        setState("success");
        console.info("[intencao-voto][voto] voto registrado com sucesso", {
          pesquisaId: pesquisa.id,
          participanteId: participante.id,
        });
        return "success" as const;
      } catch {
        setState("error");
        setError("Erro inesperado ao registrar voto.");
        console.error("[intencao-voto][voto] erro inesperado durante envio");
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
