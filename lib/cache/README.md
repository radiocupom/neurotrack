# Cache

O módulo de cache legado do dashboard foi removido na migração para arquitetura direta via Server Actions + `service/api.ts`.

Estado atual desta pasta:

- `cache-manager.ts`: utilitário genérico de cache em memória, ainda disponível para uso futuro.
- `README.md`, `CACHE-SYSTEM.md`, `EXEMPLOS-USO.md`: notas históricas simplificadas após a remoção dos wrappers antigos do dashboard.

Arquivos removidos na limpeza do legado:

- `cached-dashboard-workflow.ts`
- `use-invalidate-cache.ts`
- `service/dashboard-workflow.service.ts`

Se voltar a existir cache de dashboard, ele deve ser reconstruído em cima das Server Actions atuais, sem reintroduzir proxies HTTP locais.
