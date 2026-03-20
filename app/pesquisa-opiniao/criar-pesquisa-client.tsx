"use client";

import { useMemo, useState } from "react";

import { Alert, Button, Card, Input } from "@/app/components/ui-primitives";
import { useAuth } from "@/app/components/layout/auth-provider";
import { criarPesquisaOpiniao } from "@/service/pesquisa-opiniao-workflow.service";
import type { CriarPesquisaOpiniaoPayload } from "@/types/pesquisa-opiniao";

type OpcaoDraft = {
  texto: string;
};

type PerguntaDraft = {
  texto: string;
  obrigatoria: boolean;
  opcoes: OpcaoDraft[];
};

function emptyPergunta(): PerguntaDraft {
  return {
    texto: "",
    obrigatoria: true,
    opcoes: [{ texto: "" }, { texto: "" }],
  };
}

export function CriarPesquisaClient() {
  const { user } = useAuth();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [perguntas, setPerguntas] = useState<PerguntaDraft[]>([emptyPergunta()]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const totalOpcoes = useMemo(
    () => perguntas.reduce((acc, item) => acc + item.opcoes.length, 0),
    [perguntas],
  );

  function atualizarPergunta(index: number, partial: Partial<PerguntaDraft>) {
    setPerguntas((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...partial } : item)));
  }

  function atualizarOpcao(perguntaIndex: number, opcaoIndex: number, texto: string) {
    setPerguntas((prev) =>
      prev.map((pergunta, idx) => {
        if (idx !== perguntaIndex) return pergunta;
        return {
          ...pergunta,
          opcoes: pergunta.opcoes.map((opcao, opIdx) => (opIdx === opcaoIndex ? { texto } : opcao)),
        };
      }),
    );
  }

  function adicionarPergunta() {
    setPerguntas((prev) => [...prev, emptyPergunta()]);
  }

  function removerPergunta(index: number) {
    setPerguntas((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  }

  function adicionarOpcao(perguntaIndex: number) {
    setPerguntas((prev) =>
      prev.map((item, idx) =>
        idx === perguntaIndex ? { ...item, opcoes: [...item.opcoes, { texto: "" }] } : item,
      ),
    );
  }

  function removerOpcao(perguntaIndex: number, opcaoIndex: number) {
    setPerguntas((prev) =>
      prev.map((item, idx) => {
        if (idx !== perguntaIndex) return item;
        if (item.opcoes.length <= 2) return item;
        return {
          ...item,
          opcoes: item.opcoes.filter((_, opIdx) => opIdx !== opcaoIndex),
        };
      }),
    );
  }

  function validarPayload() {
    if (!titulo.trim()) {
      return "Titulo e obrigatorio.";
    }

    if (perguntas.length === 0) {
      return "Inclua pelo menos uma pergunta.";
    }

    for (const pergunta of perguntas) {
      if (!pergunta.texto.trim()) {
        return "Toda pergunta precisa de texto.";
      }

      const opcoesValidas = pergunta.opcoes.filter((opcao) => opcao.texto.trim());
      if (opcoesValidas.length < 2) {
        return "Cada pergunta precisa de pelo menos 2 opcoes.";
      }
    }

    if (!user?.id) {
      return "Usuario nao autenticado para criacao.";
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);

    const validationError = validarPayload();
    if (validationError) {
      setErro(validationError);
      return;
    }

    const payload: CriarPesquisaOpiniaoPayload = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      criadoPorId: user?.id || "",
      perguntas: {
        create: perguntas.map((pergunta, perguntaIndex) => ({
          texto: pergunta.texto.trim(),
          ordem: perguntaIndex + 1,
          obrigatoria: pergunta.obrigatoria,
          opcoes: pergunta.opcoes
            .filter((opcao) => opcao.texto.trim())
            .map((opcao, opcaoIndex) => ({
              texto: opcao.texto.trim(),
              ordem: opcaoIndex + 1,
            })),
        })),
      },
    };

    setLoading(true);
    const result = await criarPesquisaOpiniao(payload);
    setLoading(false);

    if (!result.ok) {
      setErro(result.message || "Falha ao criar pesquisa.");
      return;
    }

    setSucesso("Pesquisa criada com sucesso.");
    setTitulo("");
    setDescricao("");
    setPerguntas([emptyPergunta()]);
  }

  return (
    <section className="flex flex-1 min-w-0 flex-col p-3 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(8,15,31,0.88),rgba(15,23,42,0.78))] p-4 sm:p-6 shadow-2xl shadow-slate-950/40">
        <Card>
          <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200">
            Pesquisa de Opiniao
          </div>
          <h2 className="mt-3 text-2xl font-black text-white">Criar Pesquisa</h2>
          <p className="mt-1 text-sm text-slate-300">Monte perguntas objetivas com opcoes claras para coleta em campo.</p>
        </Card>

        {erro && <Alert type="error">{erro}</Alert>}
        {sucesso && <Alert type="success">{sucesso}</Alert>}

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <Card>
            <div className="grid gap-3">
              <Input label="Titulo" value={titulo} onChange={(event) => setTitulo(event.target.value)} required />
              <Input
                label="Descricao"
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
                placeholder="Objetivo da pesquisa"
              />
            </div>
          </Card>

          {perguntas.map((pergunta, perguntaIndex) => (
            <Card key={`pergunta-${perguntaIndex}`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-100">Pergunta {perguntaIndex + 1}</h3>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => removerPergunta(perguntaIndex)}
                >
                  Remover pergunta
                </Button>
              </div>

              <div className="grid gap-3">
                <Input
                  label="Texto da pergunta"
                  value={pergunta.texto}
                  onChange={(event) => atualizarPergunta(perguntaIndex, { texto: event.target.value })}
                  required
                />

                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={pergunta.obrigatoria}
                    onChange={(event) => atualizarPergunta(perguntaIndex, { obrigatoria: event.target.checked })}
                  />
                  Pergunta obrigatoria
                </label>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-300">Opcoes</p>
                  {pergunta.opcoes.map((opcao, opcaoIndex) => (
                    <div key={`opcao-${perguntaIndex}-${opcaoIndex}`} className="flex items-center gap-2">
                      <Input
                        value={opcao.texto}
                        onChange={(event) => atualizarOpcao(perguntaIndex, opcaoIndex, event.target.value)}
                        placeholder={`Opcao ${opcaoIndex + 1}`}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => removerOpcao(perguntaIndex, opcaoIndex)}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}

                  <Button type="button" variant="secondary" onClick={() => adicionarOpcao(perguntaIndex)}>
                    Adicionar opcao
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" onClick={adicionarPergunta}>
                Adicionar pergunta
              </Button>
              <Button type="submit" loading={loading}>
                Salvar pesquisa
              </Button>
              <span className="text-xs text-slate-400">
                {perguntas.length} pergunta(s) • {totalOpcoes} opcao(oes)
              </span>
            </div>
          </Card>
        </form>
      </div>
    </section>
  );
}
