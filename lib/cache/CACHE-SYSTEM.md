# Sistema de Cache

Este documento descrevia o cache legado do dashboard, removido na migração arquitetural de 20/03/2026.

Situação atual:

- O dashboard usa Server Actions diretas e não depende mais de wrappers locais nem de uma camada de proxy HTTP interna.
- `cache-manager.ts` continua disponível como utilitário genérico de cache em memória.
- Não existem mais `cached-dashboard-workflow.ts` nem `use-invalidate-cache.ts` neste repositório.

Se um novo cache for necessário:

1. ele deve ser opcional;
2. deve envolver as Server Actions atuais;
3. não deve reintroduzir `requestLocalApi` nem dependência de rotas proxy internas.
