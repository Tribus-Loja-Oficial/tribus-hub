# Hub API + D1 Migration (development)

Este documento descreve o estado atual da migracao para `hub-api` + `D1`.

## Ja implementado

- Scaffold do Worker interno em `apps/hub-api`.
- Configuracao de binding D1 em `apps/hub-api/wrangler.toml`.
- Endpoint de saude `GET /health`.
- Endpoint de conectividade `GET /db-ping`.
- Endpoint de dominio inicial `GET /v1/workspace/members`.
- Endpoint de dominio inicial `GET /v1/projects`.
- Endpoints de tasks leitura:
  - `GET /v1/tasks`
  - `GET /v1/tasks/board`
  - `GET /v1/task-labels`
- Endpoints de tasks escrita:
  - `POST /v1/tasks`
  - `POST /v1/task-labels`
  - `POST /v1/tasks/move`
  - `PATCH /v1/task-columns/reorder`
  - `PATCH /v1/tasks/:id`
  - `DELETE /v1/tasks/:id`
- Endpoints de tasks detalhamento:
  - `GET /v1/task-columns`
  - `GET /v1/tasks/:id`
- Endpoints de knowledge leitura:
  - `GET /v1/knowledge/tree`
  - `GET /v1/knowledge/pages`
  - `GET /v1/knowledge/pages/:id`
  - `GET /v1/knowledge/pages/:id/revisions`
- Endpoints de knowledge escrita:
  - `POST /v1/knowledge/pages`
  - `PATCH /v1/knowledge/pages/:id`
  - `DELETE /v1/knowledge/pages/:id`
  - `POST /v1/knowledge/pages/reorder`
  - `POST /v1/knowledge/pages/:id/archive`
  - `POST /v1/knowledge/pages/:id/restore`
- Endpoints de OKR leitura:
  - `GET /v1/okr/cycles`
  - `GET /v1/okr/objectives`
- Assinatura HMAC interna entre `hub-web` e `hub-api`.
- Cliente interno no `hub-web` em `src/lib/integrations/hub-api/client.ts`.
- Feature flag para alternar origem de dados em `src/app/api/workspace/members/route.ts`.
- Scripts raiz para dev/deploy do Worker.

## Variaveis novas (hub-web)

- `HUB_API_ENABLED=true|false`
- `HUB_API_URL=http://127.0.0.1:8787`
- `HUB_API_INTERNAL_SECRET=<segredo compartilhado com o Worker>`

## Variaveis e binding (hub-api)

- Binding D1: `TRIBUS_HUB_DB`
- Secret: `HUB_API_INTERNAL_SECRET`

## Passos manuais no Cloudflare

1. Criar o D1 database:
   - Nome: `tribus_hub_db`
2. Copiar o `database_id` gerado e preencher em `apps/hub-api/wrangler.toml`.
3. Definir secret do Worker:
   - `wrangler secret put HUB_API_INTERNAL_SECRET`
4. Aplicar migration inicial:
   - `npm run d1:migrate:remote --workspace @tribus/hub-api`
5. Fazer deploy do Worker:
   - `npm run deploy:hub-api`
6. Configurar no `hub-web`:
   - `HUB_API_ENABLED=true`
   - `HUB_API_URL=https://<seu-worker>.workers.dev`
   - `HUB_API_INTERNAL_SECRET=<mesmo valor do Worker>`

## Proximo bloco recomendado

1. Portar `projects` para `hub-api`.
2. Portar `tasks`.
3. Portar `knowledge`.
4. Portar `okr`.
5. Remover acesso direto ao DB no `hub-web`.
