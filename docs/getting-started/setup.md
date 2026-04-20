# Setup local

Como configurar e rodar o **tribus-hub** na sua máquina.

## Pré-requisitos

- **Node.js** 22+ (alinhado ao `engines` do `package.json` e ao CI)
- **npm**
- **Cloudflare D1** configurado para o worker `hub-api`
- **Conta Cloudflare R2** (opcional em dev; uploads falham sem ela)

## Passos

1. **Clone o repositório** (ou navegue até a pasta do hub no monorepo).

2. **Instale as dependências:**

   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**

   - Copie `.env.example` para `.env.local`.
  - Preencha pelo menos as variáveis obrigatórias: `AUTH_SECRET`, `HUB_API_URL`, `HUB_API_INTERNAL_SECRET` e as credenciais R2.
   - Detalhes: [Variáveis de ambiente](environment-variables.md).

4. **Suba o hub-api em outro terminal:**

   ```bash
   npm run dev:hub-api
   ```

5. **Aplique migrations do D1 local:**

   ```bash
   npm run d1:migrate:local --workspace @tribus/hub-api
   ```

   Isso cria:
   - Workspace `tribus`
   - Usuário `admin@tribus.com.br` / senha `changeme123!`
   - 5 colunas do kanban (Backlog, To do, In progress, Blocked, Done)
   - Páginas de onboarding no Knowledge

6. **Inicie o servidor de desenvolvimento:**

   ```bash
   npm run dev
   ```

7. **Acesse no navegador:**

   [http://localhost:3000](http://localhost:3000) — você será redirecionado ao login.

   Login inicial: `admin@tribus.com.br` / `changeme123!`  
   **Troque a senha imediatamente após o primeiro acesso.**

## Scripts úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (hot reload) |
| `npm run build` | Build de produção |
| `npm run typecheck` | Verificação de tipos TypeScript |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (formata arquivos) |
| `npm run test` | Unit tests (watch mode) |
| `npm run test:coverage` | Unit tests com relatório de cobertura |
| `npm run dev:hub-api` | Sobe o Worker interno (hub-api) |
| `npm run d1:migrate:local --workspace @tribus/hub-api` | Aplica migrations no D1 local |

## Próximos passos

- [Variáveis de ambiente](environment-variables.md) — referência completa de env vars
- [architecture/overview](../architecture/overview.md) — entender a arquitetura do hub
- [domains/knowledge](../domains/knowledge.md) — como funciona o editor de páginas
