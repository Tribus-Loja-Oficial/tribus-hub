# tribus-hub-api

Cloudflare Worker interno para o `tribus-hub`.

## Objetivo

- Centralizar acesso a dados do Hub fora do app web.
- Acessar D1 somente via binding (`TRIBUS_HUB_DB`).
- Expor API interna versionada (`/v1/...`).

## Endpoints iniciais

- `GET /health`
- `GET /db-ping`
- `GET /v1/workspace/members` (assinado via HMAC interno)
- `GET /v1/projects` (assinado via HMAC interno)
- `GET /v1/tasks/board` (assinado via HMAC interno)
- `GET /v1/task-labels` (assinado via HMAC interno)
- `POST /v1/task-labels` (assinado via HMAC interno)
- `GET /v1/task-columns` (assinado via HMAC interno)
- `PATCH /v1/task-columns/reorder` (assinado via HMAC interno)
- `GET /v1/tasks` (assinado via HMAC interno)
- `POST /v1/tasks` (assinado via HMAC interno)
- `POST /v1/tasks/move` (assinado via HMAC interno)
- `GET /v1/tasks/:id` (assinado via HMAC interno)
- `PATCH /v1/tasks/:id` (assinado via HMAC interno)
- `DELETE /v1/tasks/:id` (assinado via HMAC interno)
- `GET /v1/knowledge/tree` (assinado via HMAC interno)
- `GET /v1/knowledge/pages` (assinado via HMAC interno)
- `GET /v1/knowledge/pages/:id` (assinado via HMAC interno)
- `GET /v1/knowledge/pages/:id/revisions` (assinado via HMAC interno)
- `POST /v1/knowledge/pages` (assinado via HMAC interno)
- `PATCH /v1/knowledge/pages/:id` (assinado via HMAC interno)
- `DELETE /v1/knowledge/pages/:id` (assinado via HMAC interno)
- `POST /v1/knowledge/pages/reorder` (assinado via HMAC interno)
- `POST /v1/knowledge/pages/:id/archive` (assinado via HMAC interno)
- `POST /v1/knowledge/pages/:id/restore` (assinado via HMAC interno)
- `GET /v1/okr/cycles` (assinado via HMAC interno)
- `GET /v1/okr/objectives` (assinado via HMAC interno)
- `POST /v1/internal/auth/user-by-email` (assinado via HMAC interno)

## Variaveis e binding

- `HUB_API_INTERNAL_SECRET`
- D1 binding: `TRIBUS_HUB_DB`

## Comandos

- `npm run dev:hub-api` (a partir da raiz)
- `npm run deploy:hub-api` (a partir da raiz)
