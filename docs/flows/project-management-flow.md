# Project Management Flow

## Criação de projeto

```
POST /api/projects { title, summary?, status?, priority? }
→ requireAuth()
→ createProjectSchema.parse(body)
→ slugify(title) → checar colisão → uniqueSlug se necessário
→ projects.repository.createProject()
→ audit: project.created
```

## Criação de milestone

```
POST /api/projects/:id/milestones { title, dueDate?, status? }
→ Verificar que projeto pertence ao workspace do usuário
→ createMilestoneSchema.parse(body)
→ projects.repository.createMilestone()
```

## Atualização de status

```
PATCH /api/projects/:id { status: 'completed' }
→ projects.repository.updateProject()
→ Campo completedAt pode ser preenchido manualmente ou via lógica futura
```

## Associação com tarefas

```
Tarefa tem campos: projectId, milestoneId (opcionais)
POST /api/tasks { ..., projectId: 'proj-xxx', milestoneId: 'ms-yyy' }
→ tasks.repository.createTask() com os campos preenchidos
→ GET /api/tasks?projectId=proj-xxx → filtra por projeto
```
