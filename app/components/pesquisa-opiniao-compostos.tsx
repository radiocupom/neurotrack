/**
 * Componentes Compostos para Pesquisa de Opinião
 */

"use client";

import React, { useEffect, useState } from "react";
import { Card, Input, Button, Alert, RadioGroup, Select } from "./ui-primitives";
import {
  carregarCidadesPorUf,
  carregarEstadosBrasileiros,
  type CidadeOption,
  type EstadoOption,
} from "@/service/localidades-publicas.service";
import type {
  Pergunta,
  ParticipanteNormalizado,
} from "@/types/pesquisa-opiniao";

// ============================================================================
// COMPONENTE: FormularioLocalizacao
// ============================================================================

interface FormularioLocalizacaoProps {
  onSubmit: (localizacao: {
    estado: string;
    cidade: string;
    bairro: string;
  }) => void;
  loading?: boolean;
  errors?: Record<string, string>;
}

export function FormularioLocalizacao({
  onSubmit,
  loading = false,
  errors = {},
}: FormularioLocalizacaoProps) {
  const [estado, setEstado] = useState("SP");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [estados, setEstados] = useState<EstadoOption[]>([]);
  const [cidades, setCidades] = useState<CidadeOption[]>([]);
  const [loadingEstados, setLoadingEstados] = useState(false);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    const loadEstados = async () => {
      setLoadingEstados(true);
      setLoadError(null);

      try {
        const result = await carregarEstadosBrasileiros();
        if (!result.ok || !result.data) {
          throw new Error(result.message || "Falha ao carregar estados.");
        }

        const estadosCarregados = result.data;

        if (canceled) {
          return;
        }

        setEstados(estadosCarregados);
        setEstado((current) => {
          if (estadosCarregados.some((item) => item.sigla === current)) {
            return current;
          }

          return estadosCarregados[0]?.sigla ?? current;
        });
      } catch (error) {
        if (!canceled) {
          setLoadError(error instanceof Error ? error.message : "Falha ao carregar estados.");
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
      return;
    }

    let canceled = false;

    const loadCidades = async () => {
      setLoadingCidades(true);
      setLoadError(null);
      setCidade("");

      try {
        const result = await carregarCidadesPorUf(estado);
        if (!result.ok || !result.data) {
          throw new Error(result.message || "Falha ao carregar cidades.");
        }

        if (!canceled) {
          setCidades(result.data);
        }
      } catch (error) {
        if (!canceled) {
          setCidades([]);
          setLoadError(error instanceof Error ? error.message : "Falha ao carregar cidades.");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ estado, cidade, bairro });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {loadError && <Alert type="warning">{loadError}</Alert>}

      <Select
        label="Estado"
        options={estados.map((item) => ({ value: item.sigla, label: `${item.sigla} - ${item.nome}` }))}
        value={estado}
        onChange={(e) => setEstado(e.target.value)}
        required
        disabled={loading || loadingEstados}
        error={errors.estado}
      />

      <Select
        label="Cidade"
        options={cidades.map((item) => ({ value: item.nome, label: item.nome }))}
        value={cidade}
        onChange={(e) => setCidade(e.target.value)}
        required
        disabled={loading || loadingCidades || !estado}
        error={errors.cidade}
      />

      <Input
        label="Bairro"
        placeholder="Digite o bairro"
        value={bairro}
        onChange={(e) => setBairro(e.target.value)}
        required
        disabled={loading}
        error={errors.bairro}
      />

      <Button type="submit" loading={loading} fullWidth>
        Próximo
      </Button>
    </form>
  );
}

// ============================================================================
// COMPONENTE: PerguntaResponder
// ============================================================================

interface PerguntaResponderProps {
  pergunta: Pergunta;
  value?: string;
  onChange: (opcaoId: string) => void;
  error?: string;
}

export function PerguntaResponder({
  pergunta,
  value,
  onChange,
  error,
}: PerguntaResponderProps) {
  return (
    <Card className="mb-4">
      <div className="mb-4">
        <h3 className="mb-1 font-semibold text-slate-100">{pergunta.texto}</h3>
        {pergunta.obrigatoria && (
          <p className="text-xs text-red-300">* Obrigatoria</p>
        )}
      </div>

      <RadioGroup
        name={`pergunta-${pergunta.id}`}
        options={pergunta.opcoes.map((opcao) => ({
          value: opcao.id,
          label: opcao.texto,
        }))}
        value={value}
        onChange={onChange}
        error={error}
      />
    </Card>
  );
}

// ============================================================================
// COMPONENTE: ListaPerguntas
// ============================================================================

interface ListaPerguntasProps {
  perguntas: Pergunta[];
  respostas: Record<string, string>;
  onResponder: (perguntaId: string, opcaoId: string) => void;
  erros?: Record<string, string>;
}

export function ListaPerguntas({
  perguntas,
  respostas,
  onResponder,
  erros = {},
}: ListaPerguntasProps) {
  return (
    <div>
      {perguntas.map((pergunta) => (
        <PerguntaResponder
          key={pergunta.id}
          pergunta={pergunta}
          value={respostas[pergunta.id]}
          onChange={(opcaoId) => onResponder(pergunta.id, opcaoId)}
          error={erros[pergunta.id]}
        />
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENTE: ParticipanteInfo
// ============================================================================

interface ParticipanteInfoProps {
  participante: ParticipanteNormalizado | null;
  loading?: boolean;
  onMudar?: () => void;
}

export function ParticipanteInfo({
  participante,
  loading = false,
  onMudar,
}: ParticipanteInfoProps) {
  if (!participante) {
    return null;
  }

  return (
    <Card padding="sm" className="mb-4 border-emerald-400/30 bg-emerald-400/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm text-emerald-100">
            <span className="font-bold">Participante Identificado</span>
          </p>
          <p className="mt-1 text-sm text-emerald-200">{participante.nome}</p>
          {participante.contato && (
            <p className="text-xs text-emerald-200/90">{participante.contato}</p>
          )}
        </div>
        {onMudar && (
          <button
            onClick={onMudar}
            disabled={loading}
            className="text-xs text-emerald-100 underline hover:text-emerald-200"
          >
            Mudar
          </button>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// COMPONENTE: FormularioParticipantePrivado
// ============================================================================

interface FormularioParticipantePrivadoProps {
  onBuscar: (contato: string, nome?: string, email?: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
}

export function FormularioParticipantePrivado({
  onBuscar,
  loading = false,
  error = null,
  disabled = false,
}: FormularioParticipantePrivadoProps) {
  const [contato, setContato] = useState("");
  const [expandido, setExpandido] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  function maskContato(value: string) {
    const normalized = value.trim();
    if (normalized.length <= 4) {
      return "****";
    }

    return `${normalized.slice(0, 2)}***${normalized.slice(-2)}`;
  }

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    console.info("[opiniao-identificacao] submit buscar/criar", {
      contato: maskContato(contato),
      contatoLength: contato.trim().length,
      hasNome: Boolean(nome.trim()),
      hasEmail: Boolean(email.trim()),
      expandido,
    });
    await onBuscar(contato, nome || undefined, email || undefined);
  };

  return (
    <Card>
      <h3 className="mb-4 font-semibold text-slate-100">
        Identificar Participante
      </h3>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <form onSubmit={handleBuscar} className="space-y-4">
        <Input
          label="Telefone ou Email"
          placeholder="(11) 99999-9999 ou email@example.com"
          value={contato}
          onChange={(e) => setContato(e.target.value)}
          required
          disabled={disabled || loading}
        />

        {expandido && (
          <>
            <Input
              label="Nome (para novo participante)"
              placeholder="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={disabled || loading}
            />

            <Input
              label="Email (opcional)"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={disabled || loading}
            />
          </>
        )}

        {!expandido && contato && (
          <button
            type="button"
            onClick={() => setExpandido(true)}
            className="text-sm text-cyan-200 hover:text-cyan-100"
          >
            + Adicionar mais informações (se não encontrar)
          </button>
        )}

        <Button
          type="submit"
          loading={loading}
          fullWidth
          disabled={disabled || !contato}
        >
          {loading ? "Buscando..." : "Buscar ou Criar"}
        </Button>
      </form>
    </Card>
  );
}

// ============================================================================
// COMPONENTE: FormularioParticipantePublico
// ============================================================================

interface FormularioParticipantePublicoProps {
  onIdentificar: (
    telefone: string,
    nome?: string,
    email?: string
  ) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
}

export function FormularioParticipantePublico({
  onIdentificar,
  loading = false,
  error = null,
  disabled = false,
}: FormularioParticipantePublicoProps) {
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  const handleIdentificar = async (e: React.FormEvent) => {
    e.preventDefault();
    await onIdentificar(telefone, nome, email || undefined);
  };

  const formatarTelefone = (valor: string) => {
    const apenas_numeros = valor.replace(/\D/g, "");
    if (apenas_numeros.length <= 11) {
      setTelefone(apenas_numeros);
    }
  };

  return (
    <Card>
      <h3 className="mb-4 font-semibold text-slate-100">Sua Identificacao</h3>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <form onSubmit={handleIdentificar} className="space-y-4">
        <Input
          label="Telefone"
          placeholder="11999999999"
          value={telefone}
          onChange={(e) => formatarTelefone(e.target.value)}
          required
          disabled={disabled || loading}
          helpText="Digite 11 dígitos com DDD"
        />

        <Input
          label="Nome"
          placeholder="Seu nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          disabled={disabled || loading}
          helpText="Opcional, mas recomendado para autocadastro"
        />

        <Input
          label="Email (opcional)"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={disabled || loading}
        />

        <Button
          type="submit"
          loading={loading}
          fullWidth
          disabled={disabled || !telefone || telefone.length !== 11}
        >
          {loading ? "Identificando..." : "Continuar"}
        </Button>
      </form>
    </Card>
  );
}

// ============================================================================
// COMPONENTE: ResumoPesquisa
// ============================================================================

interface ResumoPesquisaProps {
  titulo: string;
  descricao?: string | null;
  urlPublica?: string | null;
  totalPerguntas: number;
  totalRespostas: number;
}

export function ResumoPesquisa({
  titulo,
  descricao,
  urlPublica,
  totalPerguntas,
  totalRespostas,
}: ResumoPesquisaProps) {
  const [copiado, setCopiado] = useState(false);

  function copiarLinkPublico() {
    if (!urlPublica?.trim()) {
      return;
    }

    void navigator.clipboard.writeText(urlPublica.trim()).then(() => {
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1400);
    });
  }

  return (
    <Card className="mb-6 border-cyan-400/30 bg-cyan-400/10">
      <h2 className="mb-2 text-2xl font-bold text-slate-100">{titulo}</h2>
      {descricao && <p className="mb-4 text-slate-300">{descricao}</p>}
      <div className="mb-2 flex flex-col gap-2 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between">
        <p>
          URL publica: <span className="break-all font-semibold text-cyan-200">{urlPublica || "URL publica indisponivel"}</span>
        </p>
        {urlPublica?.trim() ? (
          <button
            type="button"
            onClick={copiarLinkPublico}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/35 bg-cyan-400/10 px-3 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
          >
            {copiado ? "Copiado!" : "Copiar link"}
          </button>
        ) : null}
      </div>
      <p className="text-sm text-slate-300">
        <span className="font-semibold">{totalPerguntas}</span> perguntas •{" "}
        <span className="font-semibold">{totalRespostas}</span> respondidas
      </p>
    </Card>
  );
}

// ============================================================================
// COMPONENTE: MensagemSucesso
// ============================================================================

interface MensagemSucessoProps {
  mensagem?: string;
  submensagem?: string;
  onNovaResposta?: () => void;
}

export function MensagemSucesso({
  mensagem = "✓ Obrigado!",
  submensagem = "Suas respostas foram registradas com sucesso.",
  onNovaResposta,
}: MensagemSucessoProps) {
  return (
    <div className="text-center py-12">
      <div className="mb-4 text-5xl text-emerald-300">OK</div>
      <h2 className="mb-2 text-2xl font-bold text-emerald-200">{mensagem}</h2>
      <p className="mb-6 text-slate-300">{submensagem}</p>
      {onNovaResposta && (
        <Button onClick={onNovaResposta} variant="secondary">
          Responder Outra Pesquisa
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE: MensagemFila
// ============================================================================

interface MensagemFilaProps {
  mensagem?: string;
  submensagem?: string;
}

export function MensagemFila({
  mensagem = "⏳ Processando",
  submensagem = "Sua resposta está sendo processada. Pode levar alguns momentos.",
}: MensagemFilaProps) {
  return (
    <Card className="bg-yellow-50 border-yellow-200 text-center py-8">
      <div className="text-4xl mb-3 animate-pulse">⏳</div>
      <h3 className="text-lg font-semibold text-yellow-800 mb-1">
        {mensagem}
      </h3>
      <p className="text-yellow-700 text-sm">{submensagem}</p>
    </Card>
  );
}
