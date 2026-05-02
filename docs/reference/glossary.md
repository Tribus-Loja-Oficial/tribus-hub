# Glossário

**Workspace** — Unidade de isolamento lógico. Atualmente sempre `tribus`. Todas as entidades pertencem a um workspace.

**Page** — Documento do domínio Knowledge. Pode ter pai (parentPageId), formando uma hierarquia em árvore.

**Page Revision** — Snapshot de uma página em um momento. Criada manualmente ou em checkpoints automáticos. Base para histórico de versões.

**Project** — Iniciativa de médio/longo prazo com status, datas e owner. Agrupa milestones, tarefas e páginas.

**Milestone** — Marco de um projeto. Tem data, status e pode estar associado a tarefas.

**Objective / Key Result** — Estrutura OKR. Objective descreve a intenção; Key Results medem o progresso quantitativamente.

**Task Column** — Coluna do board kanban. Padrões: Backlog, To do, In progress, Blocked, Done.

**Task** — Item de trabalho. Pertence a uma coluna e opcionalmente a um projeto/milestone.

**Audit Log** — Registro imutável de ações sensíveis. Contém actor, entidade, action e metadata JSON.

**Soft Delete** — Exclusão lógica: `deleted_at` é preenchido, o registro permanece no banco. Oposto de hard delete.

**Slug** — Identificador amigável derivado do título, usado em URLs. Ex: `visao-da-marca`.

**Content JSON** — Representação Tiptap/ProseMirror do conteúdo do editor, armazenada como JSONB.

**Content Text** — Texto plano derivado do Content JSON, usado para busca simples.

**Guard** — Helper de autorização. Ex: `requireAuth()`, `requireRole('admin')`.
