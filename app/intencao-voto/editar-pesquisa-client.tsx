"use client";

import { useEffect, useState } from "react";

import { Alert, Card, Loading, Select } from "@/app/components/ui-primitives";
import {
  PesquisaIntencaoVotoForm,
  summarizePesquisaRequestBodyForLog,
  toPesquisaFormValues,
} from "@/app/intencao-voto/pesquisa-form";
import {
  atualizarPesquisaIntencaoVotoAction,
  excluirPesquisaIntencaoVotoAction,
  obterPesquisaIntencaoVotoAction,
} from "@/app/intencao-voto/workflow-actions";
import { usePesquisasIntencaoVoto } from "@/lib/hooks/use-pesquisas-intencao-voto";
import type { PesquisaIntencaoVotoDetalhe } from "@/types/intencao-voto";

export function EditarPesquisaIntencaoVotoClient() {
  const { pesquisas, loading: loadingList, error: listError, refetch } = usePesquisasIntencaoVoto({ autoload: true });
  const [pesquisaId, setPesquisaId] = useState("");
  const [pesquisa, setPesquisa] = useState<PesquisaIntencaoVotoDetalhe | null>(null);
  const [loadingPesquisa, setLoadingPesquisa] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!pesquisaId) {
      return;
    }

    let mounted = true;
    const loadPesquisa = async () => {
      setLoadingPesquisa(true);
      setError(null);
      setSuccess(null);
      const result = await obterPesquisaIntencaoVotoAction(pesquisaId);
      if (mounted) {
        if (!result.ok || !result.data) {
          setError(result.message || "Falha ao carregar pesquisa selecionada.");
        } else {
          setPesquisa(result.data);
        }
        setLoadingPesquisa(false);
      }
    };

    void loadPesquisa();

    return () => {
      mounted = false;
    };
  }, [pesquisaId]);

  async function handleSubmit(body: FormData | import("@/types/intencao-voto").AtualizarPesquisaIntencaoVotoPayload) {
    if (!pesquisaId) {
      setError("Selecione uma pesquisa.");
      return;
    }

    setError(null);
    setSuccess(null);

    console.log("[intencao-voto][client][edit] enviando payload", {
      pesquisaId,
      body: summarizePesquisaRequestBodyForLog(body),
    });

    setSaving(true);
    const result = await atualizarPesquisaIntencaoVotoAction(pesquisaId, body);

    console.log("[intencao-voto][client][edit] resposta recebida", {
      pesquisaId,
      ok: result.ok,
      status: result.status,
      message: result.message,
      returnedPesquisaId: result.data?.id || null,
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.message || "Falha ao atualizar pesquisa.");
      return;
    }

    setSuccess(result.status === 202 ? "Atualizacao enviada para fila de processamento." : "Pesquisa atualizada com sucesso.");
    if (result.data) {
      setPesquisa(result.data);
    }
    await refetch();
  }

  async function handleDelete() {
    if (!pesquisaId) {
      return;
    }

    const confirmed = window.confirm("Deseja excluir esta pesquisa? Esta acao nao pode ser desfeita.");
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);
    const result = await excluirPesquisaIntencaoVotoAction(pesquisaId);
    setDeleting(false);

    if (!result.ok) {
      setError(result.message || "Falha ao excluir pesquisa.");
      return;
    }

    setSuccess("Pesquisa excluida com sucesso.");
    setPesquisaId("");
    setPesquisa(null);
    await refetch();
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col p-3 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(8,15,31,0.88),rgba(15,23,42,0.78))] p-4 shadow-2xl shadow-slate-950/40 sm:p-6">
        {listError ? <Alert type="error">{listError}</Alert> : null}
        {error ? <Alert type="error">{error}</Alert> : null}
        {success ? <Alert type="success">{success}</Alert> : null}

        <Card>
          <Select
            label="Pesquisa"
            value={pesquisaId}
            onChange={(event) => {
              setPesquisaId(event.target.value);
              setPesquisa(null);
              setError(null);
              setSuccess(null);
            }}
            options={pesquisas.map((item) => ({ value: item.id, label: item.titulo }))}
          />
          {loadingList ? <p className="mt-2 text-sm text-slate-400">Carregando pesquisas...</p> : null}
        </Card>

        {loadingPesquisa ? <Loading message="Carregando dados da pesquisa..." /> : null}

        {pesquisa ? (
          <PesquisaIntencaoVotoForm
            key={pesquisa.id}
            mode="edit"
            title="Editar pesquisa"
            description="Ao reenviar candidatos na edicao, o backend trata a lista como substituicao completa. Revise a ordem antes de salvar."
            values={toPesquisaFormValues(pesquisa)}
            loading={saving}
            deleting={deleting}
            error={error}
            success={success}
            onSubmit={async (body) => {
              await handleSubmit(body as FormData | import("@/types/intencao-voto").AtualizarPesquisaIntencaoVotoPayload);
            }}
            onDelete={handleDelete}
          />
        ) : null}
      </div>
    </section>
  );
}
