"use client";

import Image from "next/image";
import { useState } from "react";

import { Alert, Button, Card, Input, Select } from "@/app/components/ui-primitives";
import type {
  AtualizarPesquisaIntencaoVotoPayload,
  CriarPesquisaIntencaoVotoPayload,
  PesquisaIntencaoVotoDetalhe,
} from "@/types/intencao-voto";
import {
  CARGOS_INTENCAO_VOTO as CARGOS,
  PARTIDOS_INTENCAO_VOTO as PARTIDOS,
} from "@/types/intencao-voto";

export type CandidatoDraft = {
  id?: string;
  nome: string;
  partido: string;
  fotoUrl: string;
  file: File | null;
};

export type PesquisaIntencaoVotoFormValues = {
  titulo: string;
  descricao: string;
  cargo: string;
  idRegistroTSE: string;
  urlPesquisa: string;
  ativa: boolean;
  candidatos: CandidatoDraft[];
};

const CARGO_OPTIONS = CARGOS.map((cargo) => ({ value: cargo, label: cargo.replaceAll("_", " ") }));
const PARTIDO_OPTIONS = PARTIDOS.map((partido) => ({ value: partido, label: partido }));

function withCurrentOption(value: string, options: Array<{ value: string; label: string }>) {
  const normalizedValue = value.trim();
  if (!normalizedValue || options.some((option) => option.value === normalizedValue)) {
    return options;
  }

  return [{ value: normalizedValue, label: `${normalizedValue} (atual)` }, ...options];
}

function summarizeRequestBody(
  body: CriarPesquisaIntencaoVotoPayload | AtualizarPesquisaIntencaoVotoPayload | FormData,
) {
  if (!(body instanceof FormData)) {
    return body;
  }

  const serialized: Record<string, unknown> = {};
  for (const [key, value] of body.entries()) {
    const nextValue = value instanceof File
      ? { name: value.name, size: value.size, type: value.type }
      : value;

    if (key in serialized) {
      const currentValue = serialized[key];
      serialized[key] = Array.isArray(currentValue) ? [...currentValue, nextValue] : [currentValue, nextValue];
      continue;
    }

    serialized[key] = nextValue;
  }

  return serialized;
}

export function summarizePesquisaRequestBodyForLog(
  body: CriarPesquisaIntencaoVotoPayload | AtualizarPesquisaIntencaoVotoPayload | FormData,
) {
  return summarizeRequestBody(body);
}

export function emptyCandidato(): CandidatoDraft {
  return {
    nome: "",
    partido: "",
    fotoUrl: "",
    file: null,
  };
}

export function toPesquisaFormValues(
  pesquisa?: PesquisaIntencaoVotoDetalhe | null,
): PesquisaIntencaoVotoFormValues {
  return {
    titulo: pesquisa?.titulo || "",
    descricao: pesquisa?.descricao || "",
    cargo: pesquisa?.cargo || "",
    idRegistroTSE: pesquisa?.idRegistroTSE || "",
    urlPesquisa: pesquisa?.urlPesquisa || "",
    ativa: pesquisa?.ativo !== false,
    candidatos: pesquisa?.candidatos?.length
      ? pesquisa.candidatos.map((candidato) => ({
          id: candidato.id,
          nome: candidato.nome,
          partido: candidato.partido || "",
          fotoUrl: candidato.fotoUrl || "",
          file: null,
        }))
      : [emptyCandidato()],
  };
}

function normalizeCandidates(values: PesquisaIntencaoVotoFormValues) {
  return values.candidatos.map((candidato) => ({
    id: candidato.id,
    nome: candidato.nome.trim(),
    partido: candidato.partido.trim(),
    fotoUrl: candidato.fotoUrl.trim(),
    file: candidato.file,
  }));
}

export function buildPesquisaRequest(
  values: PesquisaIntencaoVotoFormValues,
  mode: "create" | "edit",
  createdById?: string,
):
  | { ok: true; body: CriarPesquisaIntencaoVotoPayload | AtualizarPesquisaIntencaoVotoPayload | FormData }
  | { ok: false; message: string } {
  if (!values.titulo.trim()) {
    return { ok: false, message: "Titulo e obrigatorio." };
  }

  if (!values.cargo.trim()) {
    return { ok: false, message: "Cargo e obrigatorio." };
  }

  const candidatos = normalizeCandidates(values);
  if (candidatos.length === 0) {
    return { ok: false, message: "Adicione pelo menos um candidato." };
  }

  for (const candidato of candidatos) {
    if (!candidato.nome) {
      return { ok: false, message: "Todo candidato precisa de nome." };
    }

    if (!candidato.partido) {
      return { ok: false, message: "Todo candidato precisa de partido." };
    }

    if (!candidato.file && !candidato.fotoUrl) {
      return { ok: false, message: "Cada candidato precisa ter foto enviada ou URL informada." };
    }
  }

  if (mode === "create" && !createdById?.trim()) {
    return { ok: false, message: "Usuario nao autenticado para criacao." };
  }

  const hasFile = candidatos.some((candidato) => candidato.file);
  const candidatosPayload = candidatos.map((candidato) => ({
    ...(candidato.id ? { id: candidato.id } : {}),
    nome: candidato.nome,
    partido: candidato.partido,
    ...(candidato.fotoUrl && !candidato.file ? { fotoUrl: candidato.fotoUrl } : {}),
  }));

  if (hasFile) {
    const formData = new FormData();
    formData.append("titulo", values.titulo.trim());
    formData.append("descricao", values.descricao.trim());
    formData.append("cargo", values.cargo.trim());

    if (mode === "create") {
      formData.append("criadoPorId", createdById || "");
    }

    if (values.idRegistroTSE.trim()) {
      formData.append("idRegistroTSE", values.idRegistroTSE.trim());
    }

    if (values.urlPesquisa.trim()) {
      formData.append("urlPesquisa", values.urlPesquisa.trim());
    }

    if (mode === "edit") {
      formData.append("ativo", String(values.ativa));
    }

    formData.append("candidatos", JSON.stringify(candidatosPayload));
    candidatos.forEach((candidato) => {
      if (candidato.file) {
        formData.append("fotos", candidato.file);
      }
    });

    return { ok: true, body: formData };
  }

  if (mode === "create") {
    return {
      ok: true,
      body: {
        titulo: values.titulo.trim(),
        descricao: values.descricao.trim() || undefined,
        cargo: values.cargo.trim(),
        criadoPorId: createdById || "",
        idRegistroTSE: values.idRegistroTSE.trim() || undefined,
        urlPesquisa: values.urlPesquisa.trim() || undefined,
        candidatos: candidatosPayload,
      } satisfies CriarPesquisaIntencaoVotoPayload,
    };
  }

  return {
    ok: true,
    body: {
      titulo: values.titulo.trim(),
      descricao: values.descricao.trim() || undefined,
      cargo: values.cargo.trim(),
      ativo: values.ativa,
      idRegistroTSE: values.idRegistroTSE.trim() || undefined,
      urlPesquisa: values.urlPesquisa.trim() || undefined,
      candidatos: candidatosPayload,
    } satisfies AtualizarPesquisaIntencaoVotoPayload,
  };
}

export function PesquisaIntencaoVotoForm({
  mode,
  title,
  description,
  values: incomingValues,
  loading,
  deleting = false,
  error,
  success,
  createdById,
  onSubmit,
  onDelete,
}: {
  mode: "create" | "edit";
  title: string;
  description: string;
  values: PesquisaIntencaoVotoFormValues;
  loading: boolean;
  deleting?: boolean;
  error?: string | null;
  success?: string | null;
  createdById?: string;
  onSubmit: (body: CriarPesquisaIntencaoVotoPayload | AtualizarPesquisaIntencaoVotoPayload | FormData) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [values, setValues] = useState<PesquisaIntencaoVotoFormValues>(incomingValues);
  const [localError, setLocalError] = useState<string | null>(null);

  function updateCandidate(index: number, patch: Partial<CandidatoDraft>) {
    setValues((current) => ({
      ...current,
      candidatos: current.candidatos.map((candidato, candidateIndex) =>
        candidateIndex === index ? { ...candidato, ...patch } : candidato,
      ),
    }));
  }

  function moveCandidate(index: number, direction: -1 | 1) {
    setValues((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.candidatos.length) {
        return current;
      }

      const candidatos = [...current.candidatos];
      const [item] = candidatos.splice(index, 1);
      candidatos.splice(nextIndex, 0, item);
      return { ...current, candidatos };
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200">
          Intencao de Voto
        </div>
        <h2 className="mt-3 text-2xl font-black text-white">{title}</h2>
        <p className="mt-2 text-sm text-slate-300">{description}</p>
      </Card>

      {localError ? <Alert type="error">{localError}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}
      {success ? <Alert type="success">{success}</Alert> : null}

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setLocalError(null);
          const request = buildPesquisaRequest(values, mode, createdById);
          if (!request.ok) {
            setLocalError(request.message);
            return;
          }

          console.log("[intencao-voto] payload pronto para envio", {
            mode,
            createdById: createdById || null,
            body: summarizeRequestBody(request.body),
          });

          void onSubmit(request.body);
        }}
      >
        <Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Input
              label="Titulo"
              value={values.titulo}
              onChange={(event) => setValues((current) => ({ ...current, titulo: event.target.value }))}
              required
            />
            <Select
              label="Cargo"
              options={withCurrentOption(values.cargo, CARGO_OPTIONS)}
              value={values.cargo}
              onChange={(event) => setValues((current) => ({ ...current, cargo: event.target.value }))}
              required
            />
            <Input
              label="Descricao"
              value={values.descricao}
              onChange={(event) => setValues((current) => ({ ...current, descricao: event.target.value }))}
              placeholder="Levantamento de voto"
            />
            <Input
              label="Registro TSE"
              value={values.idRegistroTSE}
              onChange={(event) => setValues((current) => ({ ...current, idRegistroTSE: event.target.value }))}
              placeholder="ABC123"
            />
            <div className="lg:col-span-2">
              <Input
                label="URL da pesquisa"
                value={values.urlPesquisa}
                onChange={(event) => setValues((current) => ({ ...current, urlPesquisa: event.target.value }))}
                placeholder="https://site.com/pesquisa"
              />
            </div>
            {mode === "edit" ? (
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={values.ativa}
                  onChange={(event) => setValues((current) => ({ ...current, ativa: event.target.checked }))}
                />
                Pesquisa ativa
              </label>
            ) : null}
          </div>
        </Card>

        {values.candidatos.map((candidato, index) => (
          <Card key={`${candidato.id || "novo"}-${index}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">Candidato {index + 1}</h3>
                <p className="text-sm text-slate-400">A ordem aqui define a ordem enviada no array de candidatos.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => moveCandidate(index, -1)}>
                  Subir
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => moveCandidate(index, 1)}>
                  Descer
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    setValues((current) => ({
                      ...current,
                      candidatos:
                        current.candidatos.length === 1
                          ? current.candidatos
                          : current.candidatos.filter((_, candidateIndex) => candidateIndex !== index),
                    }))
                  }
                >
                  Remover
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_280px]">
              <div className="space-y-4">
                <Input
                  label="Nome"
                  value={candidato.nome}
                  onChange={(event) => updateCandidate(index, { nome: event.target.value })}
                  required
                />
                <Select
                  label="Partido"
                  options={withCurrentOption(candidato.partido, PARTIDO_OPTIONS)}
                  value={candidato.partido}
                  onChange={(event) => updateCandidate(index, { partido: event.target.value })}
                  required
                />
                <Input
                  label="Foto por URL"
                  value={candidato.fotoUrl}
                  onChange={(event) => updateCandidate(index, { fotoUrl: event.target.value })}
                  placeholder="https://cdn.site/candidato.jpg"
                />
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Upload da foto</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => updateCandidate(index, { file: event.target.files?.[0] ?? null })}
                    className="block w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-slate-200"
                  />
                  {candidato.file ? <p className="mt-2 text-xs text-cyan-200">Novo arquivo: {candidato.file.name}</p> : null}
                </div>
              </div>

              <div className="space-y-3 lg:col-span-2">
                <div className="text-sm font-semibold text-slate-200">Preview atual</div>
                <div className="relative h-56 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
                  {candidato.fotoUrl ? (
                    <Image src={candidato.fotoUrl} alt={candidato.nome || `Candidato ${index + 1}`} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      Nenhuma foto carregada ainda.
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Quando houver upload, a ordem dos arquivos segue a ordem dos candidatos exibida nesta tela.
                </p>
              </div>
            </div>
          </Card>
        ))}

        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setValues((current) => ({ ...current, candidatos: [...current.candidatos, emptyCandidato()] }))}
            >
              Adicionar candidato
            </Button>
            <Button type="submit" loading={loading}>
              {mode === "create" ? "Salvar pesquisa" : "Salvar alteracoes"}
            </Button>
            {onDelete ? (
              <Button type="button" variant="danger" loading={deleting} onClick={() => void onDelete()}>
                Excluir pesquisa
              </Button>
            ) : null}
          </div>
        </Card>
      </form>
    </div>
  );
}
