# Sistema de Pesquisa de Opinião - Guia Completo

## 📋 Visão Geral

Implementação completa de um sistema de pesquisa de opinião com suporte a dois modos:

1. **Fluxo Privado (Entrevistador)** - Usuário autenticado respondendo em nome do participante
2. **Fluxo Público** - Usuário não autenticado respondendo diretamente

---

## 🏗️ Arquitetura

```
service/
├── pesquisa-opiniao.service.ts       ← Chamadas da API
└── (já existe api.ts como ponto central)

lib/
├── helpers/
│   └── normalize-participante-opiniao.ts  ← Normalização
├── hooks/
│   ├── use-pesquisas-opiniao.ts          ← Listar pesquisas
│   ├── use-pesquisa-opiniao-privado.ts   ← Fluxo entrevistador
│   └── use-pesquisa-opiniao-publico.ts   ← Fluxo público
└── examples/
    └── EXEMPLOS-PESQUISA-OPINIAO.md      ← Componentes de exemplo

types/
└── pesquisa-opiniao.ts              ← Tipos compartilhados
```

---

## 📦 O Que Foi Criado

### 1. **Tipos** (`types/pesquisa-opiniao.ts`)

```typescript
// Modelos principais
- Participante
- ParticipanteNormalizado
- PesquisaOpiniao
- Pergunta
- OpcaoResposta
- RespostaUsuario
- PayloadResponderPrivado
- PayloadResponderPublico
- ApiResponse<T>
- LoadState: "idle" | "validating" | "submitting" | "queued" | "success" | "error"
```

### 2. **Serviço** (`service/pesquisa-opiniao.service.ts`)

```typescript
// Pesquisas
- listarPesquisas(token)
- obterPesquisa(token, pesquisaId)
- obterPesquisaPublica(pesquisaId)

// Participantes
- buscarParticipantePorContato(token, contato)
- identificarParticipantePublico({ nome, telefone, email })
- criarParticipante(token, { nome, email, contatoOpcional })

// Responder
- responderPesquisaPrivada(token, payload)
- responderPesquisaPublica(pesquisaId, payload)

// Admin
- obterStatusFila(token)
```

### 3. **Helpers** (`lib/helpers/normalize-participante-opiniao.ts`)

```typescript
// Normalização de participante
- normalizarParticipante(data)      ← Aceita id ou participanteId
- normalizarParticipantes(data)     ← Lista
- validarParticipante(p)
- formatarTelefone(telefone)
- validarTelefoneBrasileiro(telefone)
```

### 4. **Hooks**

#### `use-pesquisas-opiniao.ts`
```typescript
const { pesquisas, loading, error, refetch } = usePesquisasOpiniao({
  token,
  autoload?: boolean,
});
```

#### `use-pesquisa-opiniao-privado.ts`
```typescript
const {
  // Pesquisa
  pesquisa,
  pesquisaLoading,
  pesquisaError,
  
  // Participante
  participante,
  participanteLoading,
  participanteError,
  
  // Estado da resposta
  contexto,
  temRespostas,
  
  // Ações
  buscarOuCriarParticipante,
  responder,
  limpar,
} = usePesquisaOpiniaoPrivado({
  token,
  pesquisaId,
});
```

#### `use-pesquisa-opiniao-publico.ts`
```typescript
const {
  pesquisa,
  pesquisaLoading,
  pesquisaError,
  participante,
  participanteLoading,
  participanteError,
  contexto,
  temRespostas,
  identificarParticipante,
  responder,
  limpar,
} = usePesquisaOpiniaoPublico({
  pesquisaId,
});
```

---

## 🎯 Fluxos Completos

### Fluxo Privado (Entrevistador)

```
1. Listar Pesquisas
   ├─ GET /api/pesquisa-de-opniao
   └─ [PesquisaOpiniao, ...]

2. Selecionar Pesquisa
   ├─ GET /api/pesquisa-de-opniao/:id
   └─ PesquisaDetalhe { titulo, descricao, perguntas[], ... }

3. Buscar Participante por Contato
   ├─ GET /api/pesquisa-de-opniao/buscar-por-contato?contato=...
   ├─ SUCESSO (200) → Use participanteId ou id
   └─ NÃO ENCONTRADO (404) → Passe para etapa 4

4. (Opcional) Criar Novo Participante
   ├─ POST /api/participantes
   ├─ Body: { nome, email?, contatoOpcional }
   └─ Response: Participante { id, nome, ... }

5. Preencher Localização
   ├─ estado (obrigatório)
   ├─ cidade (obrigatório)
   └─ bairro (obrigatório)

6. Marcar Respostas
   ├─ Para cada pergunta: selecionar opcaoRespostaId
   └─ Array: [{ perguntaId, opcaoRespostaId }, ...]

7. Enviar Respostas
   ├─ POST /api/pesquisa-de-opniao/responder
   ├─ Body:
   │   ├─ participanteId ✓
   │   ├─ pesquisaId ✓
   │   ├─ estado ✓
   │   ├─ cidade ✓
   │   ├─ bairro ✓
   │   ├─ latitude? (opcional)
   │   ├─ longitude? (opcional)
   │   └─ respostas: [{ perguntaId, opcaoRespostaId }, ...]
   └─ Possíveis respostas:
       ├─ 201: Sucesso! Resposta registrada
       ├─ 202: Enfileirada (mostrar "processando")
       ├─ 400: Validação ou "participante já respondeu"
       ├─ 404: Participante não encontrado
       └─ 500: Erro interno ou fila falhou
```

### Fluxo Público

```
1. Carregar Pesquisa Pública
   ├─ GET /api/pesquisa-de-opniao/:id (sem autenticação)
   └─ PesquisaDetalhe { titulo, descricao, perguntas[], ... }

2. Identificar Participante
   ├─ POST /api/participantes/identificar
   ├─ Body: { nome, telefone, email? }
   └─ Response: Participante (criado ou existente)

3. Preencher Localização
   ├─ estado (obrigatório)
   ├─ cidade (obrigatório)
   └─ bairro (obrigatório)

4. Marcar Respostas
   └─ Array: [{ perguntaId, opcaoRespostaId }, ...]

5. Enviar Respostas
   ├─ POST /api/pesquisa-de-opniao/:id/responder-publico
   ├─ Body:
   │   ├─ telefone ✓
   │   ├─ nome? (opcional se já identificado)
   │   ├─ email? (opcional)
   │   ├─ estado ✓
   │   ├─ cidade ✓
   │   ├─ bairro ✓
   │   ├─ pesquisaId? (pode estar na rota já)
   │   └─ respostas: [{ perguntaId, opcaoRespostaId }, ...]
   └─ Possíveis respostas:
       ├─ 201: Sucesso!
       ├─ 202: Enfileirada
       ├─ 403: Bloqueado por IP (já respondeu)
       ├─ 404: Participante não identificado
       ├─ 400: Validação
       └─ 500: Erro interno
```

---

## 🔄 Estados de Carregamento

```typescript
type LoadState = 
  | "idle"        // Parado, pronto para envio
  | "validating"  // Validando dados localmente
  | "submitting"  // Chamada em progresso
  | "queued"      // Resposta 202 - enfileirada
  | "success"     // 201 - sucesso!
  | "error"       // Erro (4xx/5xx)
```

**Mapeamento de UI:**

```typescript
const contexto = {
  state: "submitting",
  error: null,
  isProcessing: true,  // submitting || queued
};

// No componente:
{contexto.state === "submitting" && "Enviando..."}
{contexto.state === "queued" && "Processando na fila..."}
{contexto.state === "success" && "✓ Enviado!"}
{contexto.state === "error" && <ErrorMessage text={contexto.error} />}
```

---

## 📊 Mapeamento de Erros

| Status | Cenário | Mensagem | Ação |
|--------|---------|----------|------|
| 201 | Sucesso | Resposta registrada com sucesso | Mostrar sucesso |
| 202 | Fila | Resposta enfileirada para processamento | Mostrar "processando" |
| 400 | Validação geral | Dados inválidos | Revisar campos |
| 400 | Duplicidade privada | Este participante já respondeu | Mostrar erro |
| 403 | Duplicidade pública (IP) | Já existe resposta para este dispositivo | Bloquear resposta |
| 404 | Participante não encontrado | Participante não encontrado | Buscar/criar |
| 500 | Erro interno | Erro ao registrar resposta | Tentar novamente |

---

## ✨ Padrões Técnicos

### Normalização de Participante

O backend pode retornar participante com `id` **ou** `participanteId`:

```typescript
// Função inteligente
const normalizado = normalizarParticipante(resposta.data);
// Retorna sempre:
// { id, nome, email, contato }
```

### Tratamento de Fila (202)

```typescript
if (status === 202) {
  setState("queued");
  // Mostrar mensagem: "Processando..."
  // Opcionalmente: permitir sair da tela ou aguardar
}
```

### Token e Autenticação

```typescript
// Fluxo Privado: requer token
const resultado = await responderPesquisaPrivada(token, payload);

// Fluxo Público: sem token
const resultado = await responderPesquisaPublica(pesquisaId, payload);
```

---

## 🚀 Como Usar

### 1. Instalação e Importação

```typescript
import { usePesquisaOpiniaoPrivado } from "@/lib/hooks/use-pesquisa-opiniao-privado";
// ou
import { usePesquisaOpiniaoPublico } from "@/lib/hooks/use-pesquisa-opiniao-publico";
```

### 2. Componente Privado (Entrevistador)

```typescript
export function TelaPesquisaEntrevistador() {
  const { session } = useAuth(); // seu hook de auth
  
  const {
    pesquisa,
    pesquisaLoading,
    participante,
    contexto,
    buscarOuCriarParticipante,
    responder,
  } = usePesquisaOpiniaoPrivado({
    token: session?.token || "",
    pesquisaId: "pesquisa-123",
  });

  return (
    <div>
      {pesquisaLoading && <div>Carregando...</div>}
      {pesquisa && (
        <>
          <h1>{pesquisa.titulo}</h1>
          
          {/* Etapa 1: Buscar participante */}
          <button onClick={() => buscarOuCriarParticipante(contato, nome, email)}>
            Buscar/Criar
          </button>
          
          {/* Etapa 2: Marcar respostas */}
          {pesquisa.perguntas.map(pergunta => (
            <Question key={pergunta.id} pergunta={pergunta} />
          ))}
          
          {/* Etapa 3: Enviar */}
          <button
            onClick={() => responder(localizacao, respostas)}
            disabled={contexto.isProcessing}
          >
            {contexto.state === "submitting" ? "Enviando..." : "Enviar"}
          </button>
          
          {contexto.error && <div className="error">{contexto.error}</div>}
        </>
      )}
    </div>
  );
}
```

### 3. Componente Público

```typescript
export function TelaPesquisaPublica({ pesquisaId }) {
  const {
    pesquisa,
    participante,
    contexto,
    identificarParticipante,
    responder,
  } = usePesquisaOpiniaoPublico({ pesquisaId });

  return (
    <div>
      {!participante ? (
        // Etapa 1: Identificar
        <div>
          <input placeholder="Telefone" value={telefone} onChange={...} />
          <input placeholder="Nome" value={nome} onChange={...} />
          <button onClick={() => identificarParticipante(telefone, nome, email)}>
            Continuar
          </button>
        </div>
      ) : (
        // Etapa 2: Responder
        <div>
          {pesquisa.perguntas.map(pergunta => (
            <Question key={pergunta.id} pergunta={pergunta} />
          ))}
          <button
            onClick={() => responder(localizacao, respostas)}
            disabled={contexto.isProcessing}
          >
            Enviar
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 🧪 Testando

### 1. Verificar Compilação

```bash
npx tsc --noEmit  # Sem erros de tipagem
npx eslint lib/hooks service/pesquisa-opiniao.service.ts  # Lint
```

### 2. Testar Fluxo Privado

```typescript
// No console
import { usePesquisaOpiniaoPrivado } from "@/lib/hooks/use-pesquisa-opiniao-privado";

// Seu componente deve chamar o hook e renderizar
```

### 3. Testar Fluxo Público

```typescript
// Página pública: /pesquisa-opiniao/[id]/responder-publico
```

---

## 🔧 Troubleshooting

### "Participante não encontrado"
- Certifique-se de buscar/criar participante ANTES de responder
- Verifique se contato está no formato correto

### "Já respondeu esta pesquisa"
- Isto é bloqueado pelo backend
- Mostra erro amigável automaticamente

### "Bloqueado por IP (403)"
- Fluxo público: IP já respondeu
- Sem solução no frontend (é bloqueio do servidor)

### "Enfileirada (202)"
- Resposta normal! Processamento assíncrono
- Mostrar "Processando..." é esperado

---

## 📝 Checklist de Implementação

- [x] Tipos criados (`types/pesquisa-opiniao.ts`)
- [x] Serviço de API (`service/pesquisa-opiniao.service.ts`)
- [x] Helper de normalização (`lib/helpers/normalize-participante-opiniao.ts`)
- [x] Hook privado (`lib/hooks/use-pesquisa-opiniao-privado.ts`)
- [x] Hook público (`lib/hooks/use-pesquisa-opiniao-publico.ts`)
- [x] Hook de listagem (`lib/hooks/use-pesquisas-opiniao.ts`)
- [x] Exemplos de componentes (`lib/examples/EXEMPLOS-PESQUISA-OPINIAO.md`)
- [x] Documentação completa (`PESQUISA-OPINIAO-GUIDE.md`)

---

## 🚀 Próximos Passos

1. **Criar componentes de UI**
   - Adapte os exemplos ao seu design system
   - Use seus inputs e buttons

2. **Integrar com seu app**
   - Crie páginas: `/pesquisa-opiniao/responder` (privado)
   - Crie rotas: `/pesquisa-opiniao/[id]/responder-publico` (público)

3. **Testar fluxos**
   - Teste entrevistador com participante existente
   - Teste entrevistador criando novo participante
   - Teste fluxo público

4. **Monitoramento (opcional)**
   - Implementar `obterStatusFila()` em painel admin
   - Mostrar estadísticas de respostas

---

**Implementado em:** 20/03/2026  
**Versão:** 1.0.0  
**Status:** ✅ Pronto para Integração
