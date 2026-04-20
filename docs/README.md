# Documentação — Tribus Hub

Índice central da documentação do **tribus-hub**. Toda a doc está em português (PT-BR).

**Para IA (Cursor, Claude, etc.):** leia **[AGENTS.md](../AGENTS.md)** na raiz do repositório e use o contexto em **[ai-context/](ai-context/project-context.md)** antes de qualquer tarefa.

---

## Navegação por objetivo

**Se você é novo no projeto:**
- [getting-started/setup](getting-started/setup.md) — rodar o projeto na máquina.
- [getting-started/environment-variables](getting-started/environment-variables.md) — configurar env vars.
- [architecture/overview](architecture/overview.md) — visão geral e papel do hub.
- [architecture/layers](architecture/layers.md) — as camadas da aplicação.

**Se vai trabalhar com Knowledge (editor de páginas):**
- [domains/knowledge](domains/knowledge.md) — visão do domínio.
- [flows/page-editing-flow](flows/page-editing-flow.md) — fluxo passo a passo.

**Se vai trabalhar com Tasks (kanban):**
- [domains/tasks](domains/tasks.md) — visão do domínio.
- [flows/task-board-flow](flows/task-board-flow.md) — fluxo passo a passo.

**Se vai trabalhar com Projects / OKRs:**
- [domains/projects](domains/projects.md) — visão do domínio.
- [flows/project-management-flow](flows/project-management-flow.md) — fluxo passo a passo.

**Se vai trabalhar com Assets (uploads):**
- [domains/assets](domains/assets.md) — visão do domínio.
- [flows/file-upload-flow](flows/file-upload-flow.md) — fluxo passo a passo.
- [integrations/r2](integrations/r2.md) — Cloudflare R2.

**Se vai depurar problemas:**
- [reference/env-vars](reference/env-vars.md) — variáveis de ambiente.
- [operations/deploy](operations/deploy.md) — infraestrutura e CI/CD.

---

## Começando

| Documento | Conteúdo |
|-----------|----------|
| [getting-started/setup](getting-started/setup.md) | Setup local, dependências, como rodar o projeto. |
| [getting-started/environment-variables](getting-started/environment-variables.md) | Variáveis de ambiente: onde definir, obrigatoriedade, exemplos. |

---

## Arquitetura

| Documento | Conteúdo |
|-----------|----------|
| [architecture/overview](architecture/overview.md) | Visão geral: princípios, stack, decisões e fluxo de requisição. |
| [architecture/layers](architecture/layers.md) | Camadas: config, schemas, repositories, integrations, services, API, UI. |
| [architecture/folder-structure](architecture/folder-structure.md) | Estrutura de pastas e responsabilidade de cada uma. |
| [architecture/decisions](architecture/decisions.md) | Decisões arquiteturais (ADRs): por que Drizzle, Auth.js JWT, soft delete, Tiptap, etc. |

---

## Fluxos

| Documento | Conteúdo |
|-----------|----------|
| [flows/auth-flow](flows/auth-flow.md) | Login: credentials → Auth.js → JWT em cookie HttpOnly. |
| [flows/page-editing-flow](flows/page-editing-flow.md) | Criar página, autosave, revisões, arquivo/restore. |
| [flows/task-board-flow](flows/task-board-flow.md) | Board: carregar, arrastar, mover, criar tarefa. |
| [flows/file-upload-flow](flows/file-upload-flow.md) | Upload: validar → R2 → persistir metadados → link. |
| [flows/project-management-flow](flows/project-management-flow.md) | Criar projeto → milestone → associar tarefas e OKRs. |

---

## Domínios

| Documento | Conteúdo |
|-----------|----------|
| [domains/auth](domains/auth.md) | Autenticação, roles, guards, cookies JWT. |
| [domains/knowledge](domains/knowledge.md) | Wiki, páginas, editor Tiptap, autosave, revisões. |
| [domains/projects](domains/projects.md) | Projetos, milestones, OKRs, status e health. |
| [domains/tasks](domains/tasks.md) | Kanban, colunas, sort order, drag-and-drop. |
| [domains/assets](domains/assets.md) | Uploads R2, metadados, signed URLs, asset links. |

---

## Integrações

| Documento | Conteúdo |
|-----------|----------|
| [integrations/r2](integrations/r2.md) | Cloudflare R2: bucket, upload, signed URL, delete. |
| [integrations/auth](integrations/auth.md) | Auth.js: credentials provider, JWT, sessão, cookie. |

---

## Operações

| Documento | Conteúdo |
|-----------|----------|
| [operations/deploy](operations/deploy.md) | Deploy: infraestrutura, CI/CD, Vercel, primeira vez, rollback. |
| [operations/seeding](operations/seeding.md) | Seed: workspace, usuário inicial, colunas, páginas de onboarding. |

---

## Convenções

| Documento | Conteúdo |
|-----------|----------|
| [conventions/code](conventions/code.md) | Regras de código: TypeScript, componentes, API, Zod, hooks, testes. |
| [conventions/security](conventions/security.md) | Segurança: cookies, secrets, autorização, soft delete, R2. |

---

## Referência

| Documento | Conteúdo |
|-----------|----------|
| [reference/routes](reference/routes.md) | Rotas da API: método, path, auth, service, erros. |
| [reference/env-vars](reference/env-vars.md) | Variáveis de ambiente: obrigatoriedade, escopo, exemplos. |
| [reference/glossary](reference/glossary.md) | Glossário de termos do projeto. |

---

## Contexto para IA

| Documento | Conteúdo |
|-----------|----------|
| [AGENTS.md](../AGENTS.md) (raiz) | Guia obrigatório para IA: leitura obrigatória, regras, checklist de entrega. |
| [ai-context/project-context](ai-context/project-context.md) | Contexto canônico: visão geral, camadas, domínios, fluxos, integrações, regras críticas. |
| [ai-context/development-rules](ai-context/development-rules.md) | Regras de arquitetura, documentação e implementação; análise antes de codar; entrega. |
| [ai-context/task-template](ai-context/task-template.md) | Template reutilizável de prompt para tarefas (qualquer IA). |
