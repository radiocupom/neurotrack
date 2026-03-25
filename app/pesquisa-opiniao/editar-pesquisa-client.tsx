"use client";

import { useEffect, useMemo, useState } from "react";

import { Alert, Button, Card, Input, Select, Toggle } from "@/app/components/ui-primitives";
import {
  atualizarPesquisaOpiniao,
  excluirPesquisaOpiniao,
  listarPesquisasOpiniao,
  obterPesquisaOpiniao,
} from "@/app/pesquisa-opiniao/workflow-actions";
import type { PesquisaDetalhe, PesquisaOpiniao } from "@/types/pesquisa-opiniao";

type OpcaoDraft = {
  id?: string;
  texto: string;
};

type PerguntaDraft = {
  id?: string;
  texto: string;
  obrigatoria: boolean;
  opcoes: OpcaoDraft[];
};

type PesquisaDraft = {
  titulo: string;
  descricao: string;
  ativo: boolean;
  perguntas: PerguntaDraft[];
};

function toDraft(pesquisa: PesquisaDetalhe) {
  return {
    titulo: pesquisa.titulo,
    descricao: pesquisa.descricao ?? "",
    ativo: pesquisa.ativo !== false,
    perguntas: pesquisa.perguntas.map((pergunta) => ({
      id: pergunta.id,
      texto: pergunta.texto,
      obrigatoria: pergunta.obrigatoria !== false,
      opcoes: pergunta.opcoes.map((opcao) => ({ id: opcao.id, texto: opcao.texto })),
    })),
  };
}

function normalizePerguntasForCompare(perguntas: PerguntaDraft[]) {
  return perguntas.map((pergunta, perguntaIndex) => ({
    id: pergunta.id?.trim() || "",
    texto: pergunta.texto.trim(),
    obrigatoria: pergunta.obrigatoria !== false,
    ordem: perguntaIndex + 1,
    opcoes: pergunta.opcoes
      .filter((opcao) => Boolean(opcao.texto.trim()))
      .map((opcao, opcaoIndex) => ({
        id: opcao.id?.trim() || "",
        texto: opcao.texto.trim(),
        ordem: opcaoIndex + 1,
      })),
  }));
}

function perguntasMudaram(atual: PerguntaDraft[], inicial: PerguntaDraft[]) {
  const perguntasAtuais = normalizePerguntasForCompare(atual);
  const perguntasIniciais = normalizePerguntasForCompare(inicial);

  return JSON.stringify(perguntasAtuais) !== JSON.stringify(perguntasIniciais);
}

function buildPerguntasPayload(perguntas: PerguntaDraft[]) {
  return {
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
  };
}

export function EditarPesquisaClient() {
  const [pesquisas, setPesquisas] = useState<PesquisaOpiniao[]>([]);
  const [pesquisaId, setPesquisaId] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [perguntas, setPerguntas] = useState<PerguntaDraft[]>([]);
  const [draftInicial, setDraftInicial] = useState<PesquisaDraft | null>(null);

  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const canEdit = Boolean(pesquisaId);

  const totalOpcoes = useMemo(
    () => perguntas.reduce((acc, item) => acc + item.opcoes.length, 0),
    [perguntas],
  );

  async function carregarPesquisas() {
    setLoadingList(true);
    const result = await listarPesquisasOpiniao();
    setLoadingList(false);

    if (!result.ok) {
      setErro(result.message || "Falha ao carregar pesquisas.");
      return;
    }

    setPesquisas(result.data ?? []);
  }

  async function carregarPesquisa(id: string) {
    setErro(null);
    setSucesso(null);

    const result = await obterPesquisaOpiniao(id);
    if (!result.ok || !result.data) {
      setErro(result.message || "Falha ao carregar pesquisa selecionada.");
      return;
    }

    const draft = toDraft(result.data);
    setTitulo(draft.titulo);
    setDescricao(draft.descricao);
    setAtivo(draft.ativo);
    setPerguntas(draft.perguntas);
    setDraftInicial(draft);
  }

  function limparFormulario() {
    setPesquisaId("");
    setTitulo("");
    setDescricao("");
    setAtivo(true);
    setPerguntas([]);
    setDraftInicial(null);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void carregarPesquisas();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, []);

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
    setPerguntas((prev) => [...prev, { texto: "", obrigatoria: true, opcoes: [{ texto: "" }, { texto: "" }] }]);
  }

  function removerPergunta(index: number) {
    setPerguntas((prev) => prev.filter((_, idx) => idx !== index));
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

  function validar() {
    if (!pesquisaId) return "Selecione uma pesquisa.";
    if (!titulo.trim()) return "Titulo e obrigatorio.";
    if (!perguntas.length) return "Adicione pelo menos uma pergunta.";

    for (const pergunta of perguntas) {
      if (!pergunta.texto.trim()) return "Toda pergunta precisa de texto.";
      if (pergunta.opcoes.filter((item) => item.texto.trim()).length < 2) {
        return "Cada pergunta precisa de ao menos 2 opcoes validas.";
      }
    }

    return null;
  }

  async function salvarAlteracoes() {
    setErro(null);
    setSucesso(null);

    const validationError = validar();
    if (validationError) {
      setErro(validationError);
      return;
    }

    setLoadingSave(true);
    const payload = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      ativo,
      ...(perguntasMudaram(perguntas, draftInicial?.perguntas ?? [])
        ? { perguntas: buildPerguntasPayload(perguntas) }
        : {}),
    };

    const result = await atualizarPesquisaOpiniao(pesquisaId, {
      ...payload,
    });
    setLoadingSave(false);

    if (!result.ok) {
      setErro(result.message || "Falha ao atualizar pesquisa.");
      return;
    }

    if (ativo === false) {
      setSucesso("Pesquisa desativada com sucesso. Ela nao aparece mais na listagem de pesquisas ativas.");
      limparFormulario();
    } else {
      setSucesso("Pesquisa atualizada com sucesso.");
      if (result.data) {
        const draftAtualizado = toDraft(result.data);
        setTitulo(draftAtualizado.titulo);
        setDescricao(draftAtualizado.descricao);
        setAtivo(draftAtualizado.ativo);
        setPerguntas(draftAtualizado.perguntas);
        setDraftInicial(draftAtualizado);
      } else {
        setDraftInicial({
          titulo: payload.titulo,
          descricao: payload.descricao ?? "",
          ativo,
          perguntas,
        });
      }
    }

    await carregarPesquisas();
  }

  async function excluirPesquisaAtual() {
    if (!pesquisaId) return;
    const confirmed = window.confirm("Deseja excluir esta pesquisa? Esta acao nao pode ser desfeita.");
    if (!confirmed) return;

    setErro(null);
    setSucesso(null);
    setLoadingDelete(true);
    const result = await excluirPesquisaOpiniao(pesquisaId);
    setLoadingDelete(false);

    if (!result.ok) {
      setErro(result.message || "Falha ao excluir pesquisa.");
      return;
    }

    setSucesso("Pesquisa excluida com sucesso.");
    limparFormulario();
    await carregarPesquisas();
  }

  return (
    <section className="flex flex-1 min-w-0 flex-col p-3 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(8,15,31,0.88),rgba(15,23,42,0.78))] p-4 sm:p-6 shadow-2xl shadow-slate-950/40">
        <Card>
          <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200">
            Pesquisa de Opiniao
          </div>
          <h2 className="mt-3 text-2xl font-black text-white">Editar Pesquisa</h2>
          <p className="mt-1 text-sm text-slate-300">Atualize titulo, status e estrutura das perguntas.</p>
        </Card>

        {erro && <Alert type="error">{erro}</Alert>}
        {sucesso && <Alert type="success">{sucesso}</Alert>}

        <Card>
          <Select
            label="Pesquisa"
            value={pesquisaId}
            onChange={(event) => {
              const id = event.target.value;
              setPesquisaId(id);
              if (id) {
                void carregarPesquisa(id);
              }
            }}
            options={pesquisas.map((item) => ({ value: item.id, label: item.titulo }))}
          />
          {loadingList && <p className="mt-2 text-sm text-slate-400">Carregando pesquisas...</p>}
        </Card>

        {canEdit && (
          <>
            <Card>
              <div className="grid gap-3">
                <Input label="Titulo" value={titulo} onChange={(event) => setTitulo(event.target.value)} required />
                <Input label="Descricao" value={descricao} onChange={(event) => setDescricao(event.target.value)} />
                <Toggle
                  checked={ativo}
                  onChange={setAtivo}
                  label="Pesquisa ativa"
                  description="Quando desativada, a pesquisa deixa de aparecer em listar pesquisas."
                  disabled={loadingSave}
                />
              </div>
            </Card>

            {perguntas.map((pergunta, perguntaIndex) => (
              <Card key={`edit-pergunta-${perguntaIndex}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-slate-100">Pergunta {perguntaIndex + 1}</h3>
                  <Button type="button" variant="danger" size="sm" onClick={() => removerPergunta(perguntaIndex)}>
                    Remover pergunta
                  </Button>
                </div>

                <div className="grid gap-3">
                  <Input
                    label="Texto da pergunta"
                    value={pergunta.texto}
                    onChange={(event) => atualizarPergunta(perguntaIndex, { texto: event.target.value })}
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
                      <div key={`edit-opcao-${perguntaIndex}-${opcaoIndex}`} className="flex items-center gap-2">
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
                <Button type="button" loading={loadingSave} onClick={() => void salvarAlteracoes()}>
                  Salvar alteracoes
                </Button>
                <Button type="button" variant="danger" loading={loadingDelete} onClick={() => void excluirPesquisaAtual()}>
                  Excluir pesquisa
                </Button>
                <span className="text-xs text-slate-400">
                  {perguntas.length} pergunta(s) • {totalOpcoes} opcao(oes)
                </span>
              </div>
            </Card>
          </>
        )}
      </div>
    </section>
  );
}
