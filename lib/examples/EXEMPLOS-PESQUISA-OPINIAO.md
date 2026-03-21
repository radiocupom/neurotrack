/**
 * Exemplos de Componentes para Pesquisa de Opinião
 * Demonstra como usar os hooks em componentes reais
 * 
 * NOTA: Esses são exemplos de referência.
 * Adapte conforme seu design system e estrutura.
 */

// ============================================================================
// EXEMPLO 1: FLUXO PRIVADO (ENTREVISTADOR)
// ============================================================================

/**
 * Componente para entrevistador responder pesquisa
 * 
 * Fluxo:
 * 1. Seleciona pesquisa
 * 2. Busca/cria participante
 * 3. Preenche localização
 * 4. Marca respostas
 * 5. Envia
 */
export function ExemploFluxoPrivado() {
  return `// app/pesquisa-opiniao/responder.tsx
"use client";

import { useState } from "react";
import { usePesquisasOpiniao } from "@/lib/hooks/use-pesquisas-opiniao";
import { usePesquisaOpiniaoPrivado } from "@/lib/hooks/use-pesquisa-opiniao-privado";
import type { RespostaUsuario } from "@/types/pesquisa-opiniao";
import { useAuth } from "@/lib/auth/session"; // seu hook de auth

export function ResponderPesquisaPrivado() {
  const { session } = useAuth();
  const token = session?.token || "";

  const [pesquisaSelecionadaId, setPesquisaSelecionadaId] = useState("");
  const [contato, setContato] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  // Listar pesquisas disponíveis
  const { pesquisas, loading: pesquisasLoading } = usePesquisasOpiniao({
    token,
  });

  // Hook principal para fluxo privado
  const {
    pesquisa,
    pesquisaLoading,
    pesquisaError,
    participante,
    participanteLoading,
    participanteError,
    contexto,
    buscarOuCriarParticipante,
    responder,
    limpar,
  } = usePesquisaOpiniaoPrivado({
    token,
    pesquisaId: pesquisaSelecionadaId,
  });

  // Estados do formulário
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [respostas, setRespostas] = useState<RespostaUsuario[]>([]);

  const handleBuscarParticipante = async () => {
    await buscarOuCriarParticipante(contato, nome, email);
  };

  const handleAdicionarResposta = (perguntaId: string, opcaoId: string) => {
    setRespostas((prev) => {
      const existe = prev.find((r) => r.perguntaId === perguntaId);
      if (existe) {
        return prev.map((r) =>
          r.perguntaId === perguntaId ? { ...r, opcaoRespostaId: opcaoId } : r
        );
      }
      return [...prev, { perguntaId, opcaoRespostaId: opcaoId }];
    });
  };

  const handleResponder = async () => {
    await responder(
      { estado, cidade, bairro },
      respostas
    );
  };

  if (!token) {
    return <div>Você deve estar autenticado para responder pesquisas.</div>;
  }

  return (
    <div className="p-6">
      <h1>Responder Pesquisa - Fluxo Entrevistador</h1>

      {/* Seleção de Pesquisa */}
      <section className="mb-6">
        <label>Selecione uma Pesquisa</label>
        <select
          value={pesquisaSelecionadaId}
          onChange={(e) => setPesquisaSelecionadaId(e.target.value)}
          disabled={pesquisasLoading}
        >
          <option value="">-- Selecione --</option>
          {pesquisas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.titulo}
            </option>
          ))}
        </select>
      </section>

      {pesquisaError && <div className="text-red-600">{pesquisaError}</div>}
      {pesquisaLoading && <div>Carregando pesquisa...</div>}

      {pesquisa && (
        <>
          {/* Identificação do Participante */}
          <section className="mb-6 border-b pb-4">
            <h2>1. Identificar Participante</h2>
            <div className="space-y-2">
              <input
                placeholder="Contato (telefone/email)"
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                disabled={participanteLoading || participanteError === null}
              />
              <input
                placeholder="Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              <input
                placeholder="Email (opcional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                onClick={handleBuscarParticipante}
                disabled={participanteLoading || !contato}
              >
                {participanteLoading ? "Buscando..." : "Buscar/Criar"}
              </button>
            </div>
            {participanteError && (
              <div className="text-red-600 mt-2">{participanteError}</div>
            )}
            {participante && (
              <div className="mt-2 p-2 bg-green-100">
                ✓ Participante: {participante.nome} ({participante.contato})
              </div>
            )}
          </section>

          {/* Localização */}
          <section className="mb-6 border-b pb-4">
            <h2>2. Localização</h2>
            <div className="space-y-2">
              <input
                placeholder="Estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              />
              <input
                placeholder="Cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
              <input
                placeholder="Bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
              />
            </div>
          </section>

          {/* Respostas */}
          <section className="mb-6 border-b pb-4">
            <h2>3. Respostas - {pesquisa.titulo}</h2>
            {pesquisa.perguntas.map((pergunta) => (
              <div key={pergunta.id} className="mb-4 p-2 border">
                <p className="font-semibold">{pergunta.texto}</p>
                <div className="ml-4 space-y-1">
                  {pergunta.opcoes.map((opcao) => (
                    <label key={opcao.id} className="flex items-center">
                      <input
                        type="radio"
                        name={\`pergunta-\${pergunta.id}\`}
                        onChange={() =>
                          handleAdicionarResposta(pergunta.id, opcao.id)
                        }
                      />
                      <span className="ml-2">{opcao.texto}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* Envio */}
          <section>
            <h2>4. Enviar</h2>
            {contexto.error && (
              <div className="text-red-600 mb-2">{contexto.error}</div>
            )}
            <button
              onClick={handleResponder}
              disabled={
                contexto.isProcessing ||
                !participante ||
                !estado ||
                !cidade ||
                !bairro ||
                respostas.length === 0
              }
            >
              {contexto.state === "submitting" && "Enviando..."}
              {contexto.state === "queued" && "Processando na fila..."}
              {contexto.state === "success" && "✓ Enviado!"}
              {["idle", "validating"].includes(contexto.state) && "Enviar Respostas"}
            </button>
          </section>
        </>
      )}
    </div>
  );
}
`;
}

// ============================================================================
// EXEMPLO 2: FLUXO PÚBLICO
// ============================================================================

export function ExemploFluxoPublico() {
  return `// app/pesquisa-opiniao/[pesquisaId]/responder-publico.tsx
"use client";

import { useState } from "react";
import { usePesquisaOpiniaoPublico } from "@/lib/hooks/use-pesquisa-opiniao-publico";
import type { RespostaUsuario } from "@/types/pesquisa-opiniao";

interface Props {
  params: { pesquisaId: string };
}

export function ResponderPesquisaPublico({ params }: Props) {
  const { pesquisaId } = params;

  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [respostas, setRespostas] = useState<RespostaUsuario[]>([]);
  const [passo, setPasso] = useState<"identificacao" | "resposta" | "sucesso">(
    "identificacao"
  );

  const {
    pesquisa,
    pesquisaLoading,
    pesquisaError,
    participante,
    participanteLoading,
    participanteError,
    contexto,
    identificarParticipante,
    responder,
  } = usePesquisaOpiniaoPublico({
    pesquisaId,
  });

  const handleIdentificar = async () => {
    await identificarParticipante(telefone, nome, email);
    if (!participanteError) {
      setPasso("resposta");
    }
  };

  const handleAdicionarResposta = (perguntaId: string, opcaoId: string) => {
    setRespostas((prev) => {
      const existe = prev.find((r) => r.perguntaId === perguntaId);
      if (existe) {
        return prev.map((r) =>
          r.perguntaId === perguntaId ? { ...r, opcaoRespostaId: opcaoId } : r
        );
      }
      return [...prev, { perguntaId, opcaoRespostaId: opcaoId }];
    });
  };

  const handleResponder = async () => {
    await responder(
      { estado, cidade, bairro },
      respostas
    );
    if (contexto.state === "success") {
      setPasso("sucesso");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Pesquisa de Opinião</h1>

      {pesquisaError && <div className="text-red-600">{pesquisaError}</div>}
      {pesquisaLoading && <div>Carregando pesquisa...</div>}

      {pesquisa && (
        <>
          {/* Passo 1: Identificação */}
          {passo === "identificacao" && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">{pesquisa.titulo}</h2>
              <p>{pesquisa.descricao}</p>

              <div className="space-y-2 bg-gray-50 p-4 rounded">
                <label>Telefone *</label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  disabled={participanteLoading}
                />

                <label>Nome *</label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={participanteLoading}
                />

                <label>Email (opcional)</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={participanteLoading}
                />

                {participanteError && (
                  <div className="text-red-600">{participanteError}</div>
                )}

                <button
                  onClick={handleIdentificar}
                  disabled={participanteLoading || !telefone || !nome}
                >
                  {participanteLoading ? "Verificando..." : "Continuar"}
                </button>
              </div>
            </section>
          )}

          {/* Passo 2: Responder */}
          {passo === "resposta" && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">{pesquisa.titulo}</h2>

                {/* Localização */}
                <div className="mb-6 p-4 bg-gray-50 rounded">
                  <h3 className="font-semibold mb-4">Localização</h3>
                  <div className="space-y-2">
                    <input
                      placeholder="Estado"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                    />
                    <input
                      placeholder="Cidade"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                    />
                    <input
                      placeholder="Bairro"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                    />
                  </div>
                </div>

                {/* Perguntas */}
                {pesquisa.perguntas.map((pergunta) => (
                  <div key={pergunta.id} className="mb-6 p-4 border rounded">
                    <p className="font-semibold mb-3">{pergunta.texto}</p>
                    <div className="space-y-2">
                      {pergunta.opcoes.map((opcao) => (
                        <label key={opcao.id} className="flex items-center">
                          <input
                            type="radio"
                            name={\`pergunta-\${pergunta.id}\`}
                            onChange={() =>
                              handleAdicionarResposta(pergunta.id, opcao.id)
                            }
                          />
                          <span className="ml-2">{opcao.texto}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {contexto.error && (
                <div className="text-red-600 p-4 bg-red-50 rounded">
                  {contexto.error}
                </div>
              )}

              <button
                onClick={handleResponder}
                disabled={
                  contexto.isProcessing ||
                  !estado ||
                  !cidade ||
                  !bairro ||
                  respostas.length === 0
                }
              >
                {contexto.state === "submitting" && "Enviando..."}
                {contexto.state === "queued" && "Processando..."}
                {["idle", "validating"].includes(contexto.state) &&
                  "Enviar Respostas"}
              </button>
            </section>
          )}

          {/* Passo 3: Sucesso */}
          {passo === "sucesso" && (
            <section className="text-center p-8 bg-green-50 rounded">
              <h2 className="text-xl font-semibold text-green-700 mb-2">
                ✓ Obrigado!
              </h2>
              <p>Suas respostas foram registradas com sucesso.</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
`;
}

export default {};
