# API Routes Reference

Todas as rotas exigem autenticação via session cookie, exceto `/api/auth` e `/api/health`.

## Knowledge

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/knowledge/pages` | Listar páginas |
| POST | `/api/knowledge/pages` | Criar página |
| GET | `/api/knowledge/pages/:id` | Obter página |
| PATCH | `/api/knowledge/pages/:id` | Atualizar página |
| DELETE | `/api/knowledge/pages/:id` | Soft delete |
| POST | `/api/knowledge/pages/:id/archive` | Arquivar |
| POST | `/api/knowledge/pages/:id/restore` | Restaurar |
| GET | `/api/knowledge/pages/:id/revisions` | Revisões |
| GET | `/api/knowledge/tree` | Árvore hierárquica |

## Projects

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/projects` | Listar projetos |
| POST | `/api/projects` | Criar projeto |
| GET | `/api/projects/:id` | Obter projeto |
| PATCH | `/api/projects/:id` | Atualizar |
| DELETE | `/api/projects/:id` | Soft delete |
| GET | `/api/projects/:id/milestones` | Milestones |
| POST | `/api/projects/:id/milestones` | Criar milestone |

## Tasks

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/tasks` | Listar tarefas |
| POST | `/api/tasks` | Criar tarefa |
| GET | `/api/tasks/:id` | Obter tarefa |
| PATCH | `/api/tasks/:id` | Atualizar |
| DELETE | `/api/tasks/:id` | Soft delete |
| GET | `/api/tasks/board` | Board completo com colunas |
| POST | `/api/tasks/move` | Mover tarefa entre colunas |
| GET | `/api/task-columns` | Listar colunas |
| PATCH | `/api/task-columns/reorder` | Reordenar colunas |

## Assets

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/assets/upload` | Upload de arquivo |
| GET | `/api/assets` | Listar assets |
| GET | `/api/assets/:id` | Obter asset com URL |
| DELETE | `/api/assets/:id` | Deletar asset |
| POST | `/api/assets/:id/link` | Associar asset a entidade |

## Search & System

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/search?q=` | Busca global |
| GET | `/api/health` | Health check |
