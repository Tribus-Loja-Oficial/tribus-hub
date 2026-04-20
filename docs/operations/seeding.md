# Seeding (D1 + hub-api)

## Primeiro login (bootstrap)

A migração **`apps/hub-api/migrations/0002_seed_bootstrap_admin.sql`** cria de forma **idempotente** (`INSERT OR IGNORE`):

1. **Workspace** `Tribus` (slug `tribus`, id fixo `seed_ws_tribus_hub_01`)
2. **Usuário owner** `admin@tribus.com.br` com senha **`changeme123!`** (hash bcrypt compatível com o login)

Ela é aplicada automaticamente quando corres:

```bash
# D1 local (Wrangler)
npm run d1:migrate:local --workspace @tribus/hub-api

# D1 remoto (produção — mesmo comando do CI deploy)
npm run d1:migrate:remote --workspace @tribus/hub-api
```

Se a base **já** tinha sido criada com só a `0001_init.sql`, podes aplicar **só** o seed:

```bash
cd apps/hub-api
npx wrangler d1 execute tribus_hub_db --remote --file=./migrations/0002_seed_bootstrap_admin.sql
```

(Ajusta o nome da base em `wrangler.toml` se for diferente de `tribus_hub_db`.)

## Idempotência

Podes correr `0002` várias vezes: não duplica email nem slug graças ao `INSERT OR IGNORE`.

## Após o primeiro login

1. Trocar a senha **`changeme123!`** o quanto antes.
2. Se já existir outro workspace com slug `tribus`, o insert do workspace pode ser ignorado; nesse caso cria o utilizador manualmente ou ajusta o SQL.

## Seed legado (Postgres)

O script `src/lib/db/seeds/seed.ts` era para a stack antiga (Drizzle + Postgres) e **não** popula o D1. Usa as migrações em `apps/hub-api/migrations/` para o Worker.

## Adicionando novos usuários

Inserção em SQL no D1 (exemplo):

```sql
INSERT INTO users (id, workspace_id, name, email, password_hash, role, is_active, created_at, updated_at)
VALUES (
  'novo-id',
  'seed_ws_tribus_hub_01',
  'Nome Completo',
  'email@tribus.com.br',
  -- gerar: node -e "console.log(require('bcryptjs').hashSync('senha',10))"
  '$2a$10$...',
  'member',
  1,
  datetime('now'),
  datetime('now')
);
```
