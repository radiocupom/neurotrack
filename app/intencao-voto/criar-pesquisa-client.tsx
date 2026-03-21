"use client";

import { useState } from "react";

import { useAuth } from "@/app/components/layout/auth-provider";
import {
  PesquisaIntencaoVotoForm,
  summarizePesquisaRequestBodyForLog,
  toPesquisaFormValues,
} from "@/app/intencao-voto/pesquisa-form";
import { criarPesquisaIntencaoVotoAction } from "@/app/intencao-voto/workflow-actions";

export function CriarPesquisaIntencaoVotoClient() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  return (
    <section className="flex min-w-0 flex-1 flex-col p-3 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(8,15,31,0.88),rgba(15,23,42,0.78))] p-4 shadow-2xl shadow-slate-950/40 sm:p-6">
        <PesquisaIntencaoVotoForm
          key={formKey}
          mode="create"
          title="Criar pesquisa"
          description="Cadastre a pesquisa, informe o cargo e monte a lista final de candidatos com foto na mesma ordem do contrato enviado ao backend."
          values={toPesquisaFormValues()}
          loading={loading}
          error={error}
          success={success}
          createdById={user?.id}
          onSubmit={async (body) => {
            setError(null);
            setSuccess(null);
            setLoading(true);

            console.log("[intencao-voto][client][create] enviando payload", {
              userId: user?.id || null,
              body: summarizePesquisaRequestBodyForLog(body),
            });

            const result = await criarPesquisaIntencaoVotoAction(body as FormData | import("@/types/intencao-voto").CriarPesquisaIntencaoVotoPayload);

            console.log("[intencao-voto][client][create] resposta recebida", {
              ok: result.ok,
              status: result.status,
              message: result.message,
              pesquisaId: result.data?.id || null,
            });

            setLoading(false);

            if (!result.ok) {
              setError(result.message || "Falha ao criar pesquisa.");
              return;
            }

            setSuccess(result.status === 202 ? "Pesquisa enviada para fila de processamento." : "Pesquisa criada com sucesso.");
            setFormKey((current) => current + 1);
          }}
        />
      </div>
    </section>
  );
}
