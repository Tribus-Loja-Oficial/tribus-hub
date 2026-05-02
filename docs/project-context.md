# Tribus Hub — Contexto Canônico do Projeto

> Este arquivo é a referência canônica do `tribus-hub`. Deve ser mantido atualizado a cada mudança arquitetural significativa. Leitores: desenvolvedores, agentes de IA, novos membros do time.

## 1. Visão geral

O `tribus-hub` é a plataforma interna central da Tribus. Funciona como fonte de verdade estratégica, documental e operacional interna.

**Não é**: um clone do Notion, um SaaS genérico, um experimento.
**É**: um produto interno profissional, construído sobre a arquitetura canônica da Tribus.

## 2. Papel no ecossistema Tribus

```
tribus-storefront  → e-commerce e vitrine pública
tribus-ops         → automações, sincronização, pipelines
tribus-hub         → conhecimento, estratégia, planejamento, execução
Bling              → ERP: estoque, pedidos, fiscal (fonte operacional)
```

O hub **não replica** dados do Bling. Ele documenta, organiza e planeja.

## 3. Arquitetura em camadas

```
┌─────────────────────────────────────────────────────┐
│  UI (features/, app/)                               │
│  └─ não tem regra de negócio                        │
├─────────────────────────────────────────────────────┤
│  API Routes (app/api/)                              │
│  └─ auth → validate → call service → respond        │
├─────────────────────────────────────────────────────┤
│  Services (lib/services/)                           │
│  └─ regra de negócio, orquestra repos + integrations│
├─────────────────────────────────────────────────────┤
│  Repositories (lib/repositories/)                   │
│  └─ acesso ao banco, nada mais                      │
│  Integrations (lib/integrations/)                   │
│  └─ email, serviços externos                       │
├─────────────────────────────────────────────────────┤
│  Internal API + DB (apps/hub-api)                   │
│  └─ Cloudflare Workers + D1                         │
├─────────────────────────────────────────────────────┤
│  Config (lib/config/)                               │
│  └─ env.ts, app-config.ts, feature-flags.ts         │
└─────────────────────────────────────────────────────┘
```

## 4. Regras críticas

- `process.env` **apenas em** `src/lib/config/env.ts`
- Lógica de negócio **apenas em** `src/lib/services/`
- Queries SQL **apenas em** `src/lib/repositories/`
- Toda entrada de API **validada com Zod**
- Toda rota protegida com `requireAuth()`
- Soft delete nas entidades centrais (pages, projects, tasks)

## 5. Domínios funcionais

| Domínio   | Propósito                       |
| --------- | ------------------------------- |
| Knowledge | Wiki, páginas, editor, revisões |
| Projects  | Objetivos, OKRs, milestones     |
| Tasks     | Kanban, execução, board         |

## 6. Estrutura de pastas

```
src/
  app/                  # Next.js App Router
    (auth)/             # Login, logout
    (dashboard)/        # Área autenticada
    api/                # Rotas de API
  components/           # Componentes compartilhados
    ui/                 # Primitivos (Button, Input…)
    layout/             # Sidebar, Header
    editor/             # Tiptap wrapper
    board/              # Kanban components
  features/             # Domínios de feature
    knowledge/
    projects/
    tasks/
    search/
    auth/
  lib/
    auth/               # Auth.js config
    config/             # env, app-config, feature-flags
    db/                 # schema, migrations, seeds
    repositories/       # acesso ao banco
    integrations/       # email
    services/           # regra de negócio
    schemas/            # Zod schemas de input
    permissions/        # guards e helpers
    observability/      # logger estruturado
    errors/             # AppError hierarchy
    utils/              # ids, cn, content, debounce
    types/              # tipos compartilhados
```

## 7. Autenticação e autorização

- Auth.js com strategy JWT em cookie HttpOnly
- Roles: `owner > admin > member`
- Guard padrão: `requireAuth()` em toda rota de API
- Helpers: `requireRole()`, `canEditPage()`, `canManageUsers()`

## 8. Principais fluxos

- **Edição de página**: UI → PATCH /api/knowledge/pages/:id → knowledge.service → pages.repository → DB
- **Board**: UI (dnd-kit) → POST /api/tasks/move → task-board.service → tasks.repository → DB
- **Busca**: UI (⌘K) → GET /api/search?q= → search.service → search.repository → DB

## 9. Integrações externas

| Integração              | Uso                        | Abstração                |
| ----------------------- | -------------------------- | ------------------------ |
| Cloudflare Workers + D1 | API interna e persistência | `apps/hub-api/`          |
| Vercel                  | Deploy                     | CI/CD via GitHub Actions |

## 10. Referência de documentação

| Documento               | Localização                       |
| ----------------------- | --------------------------------- |
| Arquitetura geral       | `docs/architecture/overview.md`   |
| Camadas                 | `docs/architecture/layers.md`     |
| Decisões                | `docs/architecture/decisions.md`  |
| Knowledge domain        | `docs/domains/knowledge.md`       |
| Tasks domain            | `docs/domains/tasks.md`           |
| Fluxo de auth           | `docs/flows/auth-flow.md`         |
| Edição de páginas       | `docs/flows/page-editing-flow.md` |
| Board flow              | `docs/flows/task-board-flow.md`   |
| File upload (histórico) | `docs/flows/file-upload-flow.md`  |
| Rotas                   | `docs/reference/routes.md`        |
| Env vars                | `docs/reference/env-vars.md`      |
| Glossário               | `docs/reference/glossary.md`      |
| Deploy                  | `docs/operations/deploy.md`       |

## 11. Regra de atualização

Este arquivo deve ser atualizado sempre que:

- Uma nova camada ou padrão for introduzido
- Um novo domínio funcional for criado
- Uma decisão arquitetural for tomada
- Uma integração externa for adicionada ou removida

Não deve conter: snippets de código, estados temporários, listas de tarefas.
