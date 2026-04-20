# Domain: Tasks

## Propósito

Gestão de tarefas do dia a dia com board kanban, integrado a projetos e milestones.

## Entidades

- `task_columns` — colunas do board (Backlog, To do, In progress, Blocked, Done)
- `tasks` — itens de trabalho
- `task_labels` / `task_label_links` — etiquetas

## Colunas padrão

| Nome | Slug | Cor |
|------|------|-----|
| Backlog | backlog | slate |
| To do | to-do | blue |
| In progress | in-progress | amber |
| Blocked | blocked | red |
| Done | done | green |

Criadas pelo seed. Não devem ser removidas.

## Board

Implementado com dnd-kit:
- `DndContext` com `closestCorners` collision strategy
- `SortableContext` horizontal para colunas
- `SortableContext` vertical para tasks dentro de cada coluna
- Optimistic update: UI atualiza imediatamente, persiste via API, rollback em erro

## Sort order

Tasks usam `sort_order` inteiro. Novas tasks recebem `max_sort_order + 1000` (espaço para inserções intermediárias sem reordenação completa).

## Regras de negócio

- Mover para coluna `done` → `completed_at = now()`
- Mover para fora de `done` → `completed_at = null`
- Soft delete: `deleted_at` preenchido, não removido fisicamente
