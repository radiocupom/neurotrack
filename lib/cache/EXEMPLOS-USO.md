# Exemplos de Cache

Os exemplos antigos de cache do dashboard ficaram obsoletos após a remoção dos wrappers locais e da antiga camada de proxy HTTP interna.

Uso válido hoje:

```typescript
import { cacheManager } from "@/lib/cache/cache-manager";

const value = cacheManager.get("minha-chave");
cacheManager.set("minha-chave", { ok: true }, { ttl: 60_000 });
cacheManager.invalidate("minha-chave");
```

Se você precisar reintroduzir cache em algum módulo, faça isso sobre funções locais puras ou sobre resultados de Server Actions já normalizados, sem recriar wrappers HTTP intermediários.
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
