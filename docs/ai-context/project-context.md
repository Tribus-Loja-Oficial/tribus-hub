# Tribus Hub — Contexto Canônico do Projeto

> Arquivo de referência canônica para IAs. Deve ser mantido atualizado a cada mudança arquitetural significativa. Leitores: Cursor, Claude, desenvolvedores.

---

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

---

## 3. Arquitetura em camadas

```
┌─────────────────────────────────────────────────────┐
│  UI (features/, app/)                               │
│  └─ sem regra de negócio; Server Components default │
├─────────────────────────────────────────────────────┤
│  API Routes (app/api/)                              │
│  └─ auth → validate (Zod) → service → respond       │
├─────────────────────────────────────────────────────┤
│  Services (lib/services/)                           │
│  └─ regra de negócio, orquestra repos + integrations│
├─────────────────────────────────────────────────────┤
│  Repositories (lib/repositories/)                   │
│  └─ queries Drizzle, sem lógica de negócio          │
│  Integrations (lib/integrations/)                   │
│  └─ R2 SDK, email, serviços externos                │
├─────────────────────────────────────────────────────┤
│  Internal API + DB (apps/hub-api)                   │
│  └─ Cloudflare Workers + D1                         │
├─────────────────────────────────────────────────────┤
│  Config (lib/config/)                               │
│  └─ env.ts — único ponto de acesso ao process.env   │
└─────────────────────────────────────────────────────┘
```

Schemas Zod (`lib/schemas/`) validam na borda da API. Erros (`lib/errors/`) e observabilidade (`lib/observability/`) são transversais.

---

## 4. Regras críticas

- `process.env` **apenas em** `src/lib/config/env.ts`
- Lógica de negócio **apenas em** `src/lib/services/`
- Queries SQL **apenas em** `src/lib/repositories/`
- Toda entrada de API **validada com Zod** (`.safeParse()`)
- Toda rota protegida com `requireAuth()` (Auth.js session)
- R2 acessado **apenas via** `src/lib/integrations/r2/`
- **Soft delete obrigatório** nas entidades centrais (pages, projects, tasks) — nunca hard delete

---

## 5. Domínios funcionais

| Domínio | Propósito | Rotas principais |
|---------|-----------|------------------|
| Knowledge | Wiki, páginas, editor Tiptap, revisões | `/api/knowledge/pages` |
| Projects | Projetos, milestones, OKRs (objectives + key results) | `/api/projects`, `/api/okr` |
| Tasks | Kanban, colunas, drag-and-drop (dnd-kit) | `/api/tasks`, `/api/task-columns` |
| Assets | Upload R2, metadados, asset links | `/api/assets` |
| Search | Busca global (⌘K) | `/api/search` |
| Auth | Login credentials, roles, guards | `(auth)/` |

---

## 6. Estrutura de pastas

```
src/
  app/                  # Next.js App Router
    (auth)/             # Login, logout (não autenticado)
    (dashboard)/        # Área autenticada (sidebar + layout)
    api/                # API routes
  components/           # Componentes compartilhados
    ui/                 # Primitivos shadcn/ui (Button, Input…)
    layout/             # Sidebar, Header, AppShell
    editor/             # Tiptap wrapper
    board/              # Componentes do Kanban
  features/             # Módulos de feature por domínio
    knowledge/
    projects/
    tasks/
    assets/
    search/
    auth/
  lib/
    auth/               # Auth.js config e helpers
    config/             # env.ts, app-config, feature-flags
    db/                 # schema Drizzle, migrations, seeds
    repositories/       # Queries de banco por entidade
    integrations/       # r2/, email/ (acesso externo)
    services/           # Regra de negócio por domínio
    schemas/            # Zod schemas de input da API
    permissions/        # guards e helpers de autorização
    observability/      # logger estruturado
    errors/             # AppError hierarchy
    utils/              # ids, cn, content, debounce
    types/              # tipos compartilhados
```

---

## 7. Autenticação e autorização

- **Auth.js v5** com credentials provider (email + bcrypt)
- **Strategy:** JWT em cookie HttpOnly/Secure/SameSite=lax
- **Roles:** `owner > admin > member`
- **Guard padrão:** `requireAuth()` em toda rota de API
- **Helpers:** `requireRole()`, `canEditPage()`, `canManageUsers()`
- **Permissões:** `src/lib/permissions.ts` — `hasRole()`, `canEditPage()`, `canManageUsers()`

---

## 8. Principais fluxos

| Fluxo | Caminho |
|-------|---------|
| Edição de página | UI → PATCH `/api/knowledge/pages/:id` → knowledge.service → pages.repository → DB |
| Board kanban | UI (dnd-kit) → POST `/api/tasks/move` → task-board.service → tasks.repository → DB |
| Upload de asset | UI → POST `/api/assets/upload` → asset.service → r2.integration → R2 + DB |
| Busca global | UI (⌘K) → GET `/api/search?q=` → search.service → search.repository → DB |
| OKR | UI → POST `/api/okr/objectives` → okr.service → repositories → DB |

---

## 9. Integrações externas

| Integração | Uso | Abstração |
|-----------|-----|-----------|
| Cloudflare R2 | Storage de assets (imagens, PDFs, etc.) | `lib/integrations/r2/` |
| Cloudflare Workers + D1 | API interna e persistência | `apps/hub-api/` |
| Vercel | Deploy e hosting | CI/CD via GitHub Actions |

---

## 10. Stack de qualidade

| Ferramenta | Uso |
|-----------|-----|
| Vitest + RTL | Unit tests (coverage min. 80%) |
| ESLint flat config | Linting (eslint.config.mjs) |
| Prettier | Formatação |
| TypeScript strict | Tipagem |
| Husky + lint-staged | Hooks de pre-commit |
| GitHub Actions | CI: typecheck → format → lint → tests → build |

---

## 11. Referência de documentação

| Documento | Localização |
|-----------|-------------|
| Arquitetura geral | `docs/architecture/overview.md` |
| Camadas | `docs/architecture/layers.md` |
| Decisões (ADRs) | `docs/architecture/decisions.md` |
| Knowledge domain | `docs/domains/knowledge.md` |
| Projects domain | `docs/domains/projects.md` |
| Tasks domain | `docs/domains/tasks.md` |
| Assets domain | `docs/domains/assets.md` |
| Fluxo auth | `docs/flows/auth-flow.md` |
| Fluxo page editing | `docs/flows/page-editing-flow.md` |
| Fluxo task board | `docs/flows/task-board-flow.md` |
| Fluxo file upload | `docs/flows/file-upload-flow.md` |
| Integração R2 | `docs/integrations/r2.md` |
| Integração Auth.js | `docs/integrations/auth.md` |
| Rotas da API | `docs/reference/routes.md` |
| Variáveis de ambiente | `docs/reference/env-vars.md` |
| Glossário | `docs/reference/glossary.md` |
| Deploy | `docs/operations/deploy.md` |
| Seeding | `docs/operations/seeding.md` |
| Convenções de código | `docs/conventions/code.md` |
| Convenções de segurança | `docs/conventions/security.md` |

---

## 12. Regra de atualização

Este arquivo deve ser atualizado sempre que:
- Uma nova camada ou padrão for introduzido
- Um novo domínio funcional for criado
- Uma decisão arquitetural for tomada
- Uma integração externa for adicionada ou removida
- O stack de qualidade mudar

Não deve conter: snippets de código, estados temporários, listas de tarefas.
