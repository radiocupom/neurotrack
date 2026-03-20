"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { Alert, Button, Card, Input } from "@/app/components/ui-primitives";
import type { CandidatoIntencaoVoto, PesquisaIntencaoVotoDetalhe } from "@/types/intencao-voto";

function initials(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="truncate font-semibold text-slate-100">{value}</span>
    </div>
  );
}

export function ResumoPesquisaVoto({ pesquisa }: { pesquisa: PesquisaIntencaoVotoDetalhe }) {
  return (
    <Card className="border-cyan-400/30 bg-cyan-400/10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200">
            Intencao de Voto
          </div>
          <h2 className="mt-3 text-2xl font-black text-white">{pesquisa.titulo}</h2>
          {pesquisa.descricao ? <p className="mt-2 max-w-3xl text-sm text-slate-300">{pesquisa.descricao}</p> : null}
        </div>
        <div className="grid min-w-[220px] gap-2 text-sm text-slate-200">
          <InfoRow label="Cargo" value={pesquisa.cargo} />
          <InfoRow label="Candidatos" value={String(pesquisa.candidatos.length)} />
          <InfoRow label="Registro TSE" value={pesquisa.idRegistroTSE || "-"} />
          <InfoRow label="URL publica" value={pesquisa.urlPesquisa || "-"} />
        </div>
      </div>
    </Card>
  );
}

export function GradeCandidatosVoto({
  candidatos,
  selecionadoId,
  onSelecionar,
}: {
  candidatos: CandidatoIntencaoVoto[];
  selecionadoId?: string;
  onSelecionar: (candidatoId: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {candidatos.map((candidato) => {
        const ativo = candidato.id === selecionadoId;
        return (
          <button
            key={candidato.id}
            type="button"
            onClick={() => onSelecionar(candidato.id)}
            className={[
              "overflow-hidden rounded-2xl border text-left transition",
              ativo
                ? "border-cyan-300/60 bg-cyan-400/12 shadow-lg shadow-cyan-950/35"
                : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
            ].join(" ")}
          >
            <div className="relative aspect-[4/3] bg-slate-900/60">
              {candidato.fotoUrl ? (
                <Image src={candidato.fotoUrl} alt={candidato.nome} fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_60%)] text-4xl font-black text-cyan-200">
                  {initials(candidato.nome)}
                </div>
              )}
            </div>
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{candidato.nome}</h3>
                  <p className="text-sm text-slate-300">{candidato.partido || "Partido nao informado"}</p>
                </div>
                {ativo ? (
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-300/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-200">
                    Selecionado
                  </span>
                ) : null}
              </div>
              <div className="text-xs text-slate-400">Toque para registrar o voto neste candidato.</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function FormularioIdentificacaoPublicaVoto({
  onIdentificar,
  loading,
  error,
}: {
  onIdentificar: (payload: { telefone: string; nome?: string; email?: string }) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}) {
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  return (
    <Card>
      <h3 className="mb-4 text-lg font-bold text-white">Validar participante</h3>
      <p className="mb-4 text-sm text-slate-300">O voto publico so pode ser registrado para participantes ja cadastrados no produto.</p>
      {error ? <Alert type="error" className="mb-4">{error}</Alert> : null}
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onIdentificar({ telefone, nome: nome || undefined, email: email || undefined });
        }}
      >
        <Input
          label="Telefone"
          value={telefone}
          onChange={(event) => setTelefone(event.target.value.replace(/\D/g, "").slice(0, 11))}
          placeholder="11999999999"
          required
        />
        <Input label="Nome" value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Seu nome" />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@email.com"
        />
        <Button type="submit" loading={loading} fullWidth disabled={telefone.length !== 11}>
          Validar participante
        </Button>
      </form>
    </Card>
  );
}

export function PainelSelecaoVoto({
  pesquisa,
  candidatoId,
  onSelecionarCandidato,
  idade,
  onIdadeChange,
  canal,
  onCanalChange,
  error,
}: {
  pesquisa: PesquisaIntencaoVotoDetalhe;
  candidatoId: string;
  onSelecionarCandidato: (value: string) => void;
  idade: string;
  onIdadeChange: (value: string) => void;
  canal: string;
  onCanalChange: (value: string) => void;
  error?: string | null;
}) {
  const canais = useMemo(() => ["PRESENCIAL", "WHATSAPP"], []);

  return (
    <div className="space-y-4">
      {error ? <Alert type="error">{error}</Alert> : null}
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Idade"
            type="number"
            min={16}
            value={idade}
            onChange={(event) => onIdadeChange(event.target.value)}
            placeholder="30"
            required
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Canal</label>
            <div className="grid grid-cols-2 gap-2">
              {canais.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onCanalChange(item)}
                  className={[
                    "rounded-xl border px-4 py-3 text-sm font-semibold transition",
                    canal === item
                      ? "border-cyan-300/50 bg-cyan-400/10 text-cyan-100"
                      : "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.05]",
                  ].join(" ")}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Escolha do candidato</h3>
            <p className="text-sm text-slate-300">Selecione um unico candidato para registrar o voto.</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
            {candidatoId ? "1 candidato selecionado" : "Nenhum candidato selecionado"}
          </div>
        </div>
        <GradeCandidatosVoto
          candidatos={pesquisa.candidatos}
          selecionadoId={candidatoId}
          onSelecionar={onSelecionarCandidato}
        />
      </Card>
    </div>
  );
}

export function MetricCardVoto({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-white/[0.04]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </Card>
  );
}
