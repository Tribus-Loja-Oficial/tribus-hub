# Architecture Layers

## config (`src/lib/config/`)

Responsável por ler, validar e expor variáveis de ambiente e constantes estruturais.

- `env.ts` — Zod schema do process.env, validação na inicialização
- `app-config.ts` — constantes derivadas do env + defaults
- `feature-flags.ts` — flags booleanas de features

**Regra**: nenhuma outra camada acessa `process.env` diretamente.

## schemas (`src/lib/schemas/`)

Schemas Zod para validação de inputs externos. Usados nas API routes.

- Um arquivo por domínio: `knowledge.schemas.ts`, `tasks.schemas.ts`, etc.

## repositories (`src/lib/repositories/`)

Acesso ao banco de dados via Drizzle. Contém apenas queries.

- Nunca contém regra de negócio
- Nunca chama serviços
- Um arquivo por domínio: `pages.repository.ts`, `tasks.repository.ts`, etc.

## integrations (`src/lib/integrations/`)

Encapsula dependências externas.

- `email/` — futuro

**Regra**: não contém regra de negócio. Expõe operações de I/O.

## services (`src/lib/services/`)

Contém toda a lógica de negócio. Orquestra repositories e integrations.

- `knowledge.service.ts` — CRUD de páginas, revisões, árvore
- `task-board.service.ts` — movimentação do board, ordenação
- `audit.service.ts` — registro de auditoria

**Regra**: não conhece Request/Response. Recebe dados, retorna dados.

## API routes (`src/app/api/`)

Handlers HTTP finos.

Padrão obrigatório:

1. `requireAuth()` — autenticação
2. Parse do body com Zod schema
3. Chamada ao service
4. Retorno com `NextResponse.json()`

## UI (`src/app/`, `src/features/`, `src/components/`)

Componentes React. Server Components para leitura, Client Components para interação.

**Regras**:

- Não contém regra de negócio sensível
- Não faz queries ao banco diretamente
- Usa `fetch` ou TanStack Query para dados
- Usa Zustand apenas para estado local transiente de UI (se necessário)
