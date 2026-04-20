# Task Board Flow

## Carregamento do board

```
GET /api/tasks/board
→ task-board.service.getBoardData()
→ tasks.repository.findColumnsByWorkspace()
→ Para cada coluna: tasks.repository.findTasksByColumn()
→ Retorna { columns: [ { ...column, tasks: [...] } ] }
→ UI: KanbanBoard renderiza colunas com dnd-kit
```

## Drag-and-drop (movimentação)

```
User arrasta card
→ DragOverEvent: optimistic update local (setBoardData)
  └─ move o task da coluna origem para coluna destino na UI
→ DragEndEvent: persiste via API
  └─ POST /api/tasks/move { taskId, targetColumnId, sortOrder }
  └─ task-board.service.moveTask()
  └─ tasks.repository.updateTask()
  └─ se coluna slug === 'done': completed_at = now
  └─ audit: task.moved
→ Se mutation falhar: rollback → setBoardData(data) original
```

## Criação de tarefa

```
POST /api/tasks { title, columnId, projectId?, priority? }
→ tasks.repository.getMaxSortOrderInColumn(columnId)
→ sortOrder = max + 1000 (espaço para reordenação futura)
→ tasks.repository.createTask()
→ TanStack Query invalida cache do board
```

## Ordenação dentro da coluna

```
Reordenação manual via dnd-kit (SortableContext vertical)
→ Optimistic update da ordem local
→ PATCH /api/tasks/:id { sortOrder } para cada item afetado
(ou batch com endpoint dedicado em versão futura)
```
