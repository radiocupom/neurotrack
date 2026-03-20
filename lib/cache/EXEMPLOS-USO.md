# Exemplos Práticos de Uso do Sistema de Cache

## 📝 Cenários reais e como usar o cache em diferentes situações

---

## CENÁRIO 1: Dashboard Senso Carregando

Quando um usuário abre o dashboard, o cache melhora performance:

```typescript
// app/dashboardsenso/senso-bigfive-workflow.tsx
import { useSensoDashboard } from "@/app/dashboardsenso/use-senso-dashboard";

export function SensoBigFiveWorkflow() {
  const filters = { estado: "SP", dataInicio: "2024-01-01" };
  const { resumo, state, refetch } = useSensoDashboard(filters);

  // Primeira carga: API call completa (~1000ms)
  // Segunda carga com MESMO filtro: cache (<1ms)
  // Mudança de filtro: nova API call, novo cache

  return <div>{state === "loading" ? "Carregando..." : null}</div>;
}
```

---

## CENÁRIO 2: Criando Novo Participante

Após criar um participante, o cache do resumo fica desatualizado. Use invalidação para forçar atualização:

```typescript
import { useInvalidateDashboardCache } from "@/lib/cache/use-invalidate-cache";
import { api } from "@/service/api";

export function CreateParticipanteFlow() {
  const { invalidateResumoSensoData, invalidateParticipantesData } = 
    useInvalidateDashboardCache();

  const handleCreateParticipante = async (data: unknown) => {
    try {
      // Cria participante no backend
      await api.post("/participantes", data);

      // Invalida caches relevantes para forcing atualização
      invalidateResumoSensoData(); // Resumo pode ter mudado
      invalidateParticipantesData(); // Lista de participantes mudou

      // Agora quando refetch() for chamado, buscará dados atualizados
    } catch (error) {
      console.error("Erro ao criar participante:", error);
    }
  };

  return <button onClick={() => handleCreateParticipante({})}>Criar</button>;
}
```

---

## CENÁRIO 3: Alternando Entre Abas/Dashboards

Usuário alterna entre BigFive e Senso:
- BigFive resumo já em cache (rápido)
- Senso resumo já em cache (rápido)
- Sem requisições duplicadas

```typescript
import { useSensoDashboard } from "@/app/dashboardsenso/use-senso-dashboard";
import { useBigFiveDashboard } from "@/app/dashboardsenso/use-bigfive-dashboard";

export function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<"senso" | "bigfive">("senso");
  const sensoData = useSensoDashboard({});
  const bigfiveData = useBigFiveDashboard({});

  // Cada tab tem seu cache separado
  // Alternar entre abas é muito rápido pois dados estão em cache

  return (
    <div>
      <button onClick={() => setActiveTab("senso")}>Senso</button>
      <button onClick={() => setActiveTab("bigfive")}>BigFive</button>

      {activeTab === "senso" && <div>{sensoData.resumo?.titulo}</div>}
      {activeTab === "bigfive" && <div>{bigfiveData.resumo?.titulo}</div>}
    </div>
  );
}
```

---

## CENÁRIO 4: Monitoramento e Debug

Para verificar se o cache está funcionando:

```typescript
import { cacheManager } from "@/lib/cache/cache-manager";

export function DebugCacheExample() {
  const handleDebug = () => {
    console.log("📊 Cache Stats:", cacheManager.getStats());
    // Output: { size: 5, keys: ['dashboard::resumo-senso::...', ...] }
  };

  return <button onClick={handleDebug}>Ver Cache Stats</button>;
}
```

**No Console do Navegador:**
```javascript
// Importar cache manager
import("@/lib/cache/cache-manager").then(({ cacheManager }) => {
  // Ver cache atual
  cacheManager.getStats()
  
  // Fazer requisição (primeira = API call)
  listarQuestionariosSenso()
  
  // Segunda chamada (deve ser <1ms)
  listarQuestionariosSenso()
  
  // Limpar e chamar novamente (faz requisição)
  cacheManager.clear()
  listarQuestionariosSenso()
})
```

---

## CENÁRIO 5: Configurar Cache Dinamicamente

Para alterar TTL, edite `lib/cache/cached-dashboard-workflow.ts`:

```typescript
const CACHE_CONFIG = {
  RESUMO_SENSO: 2 * 60 * 1000, // 2 minutos (padrão)
  // ↓ Mudar para:
  RESUMO_SENSO: 10 * 60 * 1000, // 10 minutos
};
```

**Exemplo: Cache para modo Real-time**
```typescript
const CACHE_CONFIG_REALTIME = {
  RESUMO_SENSO: 30 * 1000, // 30 segundos ao invés de 2 min
  RESUMO_BIGFIVE: 30 * 1000,
};
```

**Exemplo: Cache para modo Offline/Leitura**
```typescript
const CACHE_CONFIG_OFFLINE = {
  QUESTIONARIOS_SENSO: 60 * 60 * 1000, // 1 hora
  RESUMO_SENSO: 30 * 60 * 1000, // 30 minutos
};
```

---

## CENÁRIO 6: Erro de Cache - Limpeza Manual

Se cache ficar desatualizado entre ambientes:

```typescript
import { useEffect } from "react";
import { cacheManager } from "@/lib/cache/cache-manager";

export function DashboardWithCacheReset() {
  useEffect(() => {
    // Limpar cache ao desmontar o componente
    return () => {
      cacheManager.clear();
    };
  }, []);

  return <div>Dashboard com auto-clean de cache</div>;
}
```

---

## CENÁRIO 7: Cache com Paginação

Cache funciona automaticamente com parâmetros diferentes:

```typescript
import { useState } from "react";
import { obterParticipantesSenso } from "@/lib/cache/cached-dashboard-workflow";

export function ParticipantesComPaginacao() {
  const [page, setPage] = useState(0);

  // Cada página tem seu próprio cache
  // Página 1: primeiro call API, depois cache
  // Página 2: primeiro call API, depois cache
  // Voltar Página 1: cache (muito rápido)

  const handleNextPage = async () => {
    setPage((p) => p + 1);
    // Isto dispara novo filtro → novo cache key → nova requisição
    // (ou cache se já foi visitado antes)
    
    const resultado = await obterParticipantesSenso(
      "questionario-123",
      { page: page + 1 }
    );
  };

  return <button onClick={handleNextPage}>Próxima Página</button>;
}
```

---

## CENÁRIO 8: Refresing Manual com Cache Awareness

Forçar refresh de dados específicos:

```typescript
import { useCallback } from "react";
import { useSensoDashboard } from "@/app/dashboardsenso/use-senso-dashboard";
import { useInvalidateDashboardCache } from "@/lib/cache/use-invalidate-cache";

export function DashboardComRefresh() {
  const [questionarioId, setQuestionarioId] = useState("");
  const { resumo, refetch } = useSensoDashboard({ questionarioId });
  const { invalidateResumoSensoData } = useInvalidateDashboardCache();

  const handleManualRefresh = useCallback(async () => {
    // Invalida cache para este questionário
    invalidateResumoSensoData(questionarioId);
    
    // Agora refetch pegará dados atualizados do backend
    await refetch();
  }, [refetch, invalidateResumoSensoData, questionarioId]);

  return <button onClick={handleManualRefresh}>Atualizar Dados</button>;
}
```

---

## 📊 Resumo de Boas Práticas

### ✅ USE CACHE AUTOMATICAMENTE
- Não precisa fazer nada, já está funcionando
- Primeiro load: API call normal
- Chamadas seguintes: cache (<1ms)

### ✅ INVALIDE QUANDO NECESSÁRIO
- Após criar/editar/deletar dados
- Use `useInvalidateDashboardCache()`
- Específico por tipo de dado

### ✅ MONITORE EM DESENVOLVIMENTO
- `cacheManager.getStats()` no console
- Verifique Network tab para ver requisições reais
- Procure por cache hits (<1ms)

### ✅ AJUSTE TTL CONFORME NECESSÁRIO
- Dados estáticos: TTL maior (30-60 min)
- Dados dinâmicos: TTL menor (2-5 min)
- Análises pesadas: TTL maior (5-10 min)

### ❌ NÃO FAÇA
- Não tente desabilitar o cache (não é necessário)
- Não invoque `cacheManager` diretamente em componentes
- Não modifique `CACHE_CONFIG` em tempo de execução
- Não armazene dados sensíveis (já está seguro)

---

## 🎯 Fluxo Completo Recomendado

1. **Usuário abre dashboard**
   → Primeira chamada = API call
   → Resultado armazenado em cache

2. **Usuário muda filtro**
   → Nova cache key gerada
   → Primeira chamada = API call
   → Resultado armazenado em novo cache

3. **Usuário volta ao filtro anterior**
   → Cache key encontrada
   → Retorna resultado do cache (<1ms)
   → Zero API call

4. **Usuário cria novo participante**
   → Chamada POST ao backend
   → Sucesso → invalidar cache
   → Próximo load busca dados atualizados

5. **TTL expira (5 minutos depois)**
   → Cache automaticamente removido
   → Próxima chamada = novo API call
   → Novo cache criado com dados atualizados

---

**Implementado em:** 20/03/2026  
**Versão:** 1.0.0  
**Status:** ✅ Pronto para Produção
