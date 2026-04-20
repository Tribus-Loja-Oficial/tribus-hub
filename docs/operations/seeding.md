# Seeding

## O que o seed cria

1. **Workspace** `tribus` (slug: `tribus`)
2. **Usuário owner** `admin@tribus.com.br` / `changeme123!`
3. **Colunas de task board**: Backlog, To do, In progress, Blocked, Done
4. **Páginas de onboarding**: Bem-vindo ao Tribus Hub, Visão e Posicionamento, Processos Internos

## Como rodar

```bash
# Desenvolvimento: aplique as migrations no D1 local
npm run d1:migrate:local --workspace @tribus/hub-api
```

## Idempotência

O seed usa `onConflictDoNothing()` nas inserções. Pode ser rodado múltiplas vezes sem duplicar dados.

## Após o seed

1. Acessar `/login`
2. Email: `admin@tribus.com.br`
3. Senha: `changeme123!`
4. **Trocar a senha imediatamente** via Settings (a ser implementado) ou via endpoint interno de gestão

## Adicionando novos usuários

Por enquanto, inserção via endpoints internos do `hub-api`. Interface de gerenciamento de usuários está no roadmap.

```sql
INSERT INTO users (id, workspace_id, name, email, password_hash, role)
VALUES (
  'novo-id',
  'workspace-id',
  'Nome Completo',
  'email@tribus.com.br',
  -- gerar hash: bcrypt.hash('senha', 10)
  '$2b$10$...',
  'member'
);
```
