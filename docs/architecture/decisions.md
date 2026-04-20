# Architecture Decisions

## ADR-001: Workspace-aware desde o início

**Decisão**: Todas as tabelas principais têm `workspace_id`.

**Motivo**: Mesmo sendo single-tenant inicialmente, o isolamento lógico melhora permissões, facilita auditoria e evita retrabalho estrutural se múltiplos workspaces forem necessários no futuro.

**Consequência**: O seed cria um workspace `tribus` por padrão. Toda query filtra por `workspace_id`.

---

## ADR-002: Soft delete obrigatório

**Decisão**: Entidades centrais (pages, projects, tasks) usam `deleted_at` ao invés de DELETE físico.

**Motivo**: Evitar perda acidental de dados. Permitir recuperação futura. Manter audit trail íntegro.

**Consequência**: Toda query deve filtrar `is_deleted = false` ou `deleted_at IS NULL`.

---

## ADR-003: Auth.js com JWT em cookie HttpOnly

**Decisão**: Sessão por cookie HttpOnly, strategy JWT.

**Motivo**: Segurança (não acessível via JS do browser), compatibilidade com Edge Runtime do Next.js, sem dependência de banco para sessão.

---

## ADR-004: Drizzle ORM

**Decisão**: Drizzle ao invés de Prisma ou Kysely.

**Motivo**: Type-safety extrema, SQL explícito quando necessário, migrations versionadas em SQL, sem runtime overhead de Prisma.

---

## ADR-005: Content em JSON canônico (Tiptap)

**Decisão**: `content_json` armazena o estado Tiptap. `content_text` é derivado para busca.

**Motivo**: JSON canônico é portável, versionável e reconstruível. Text plano serve para busca SQL simples sem full-text engine extra.

---

## ADR-006: Slugs únicos por sufixo aleatório

**Decisão**: Ao invés de sufixo numérico incremental (slug-2, slug-3), usar sufixo hex aleatório (my-page-a3f1b2).

**Motivo**: Evita race conditions em ambiente concorrente. Sem necessidade de query de contagem prévia.
