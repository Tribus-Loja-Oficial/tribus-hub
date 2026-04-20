# Tribus Hub

Plataforma interna central da Tribus para organização de conhecimento, documentação estratégica, planejamento e gestão operacional.

## Visão geral

O `tribus-hub` é a **fonte de verdade estratégica e documental** da Tribus. Ele complementa — sem substituir — o Bling, que permanece como fonte operacional e comercial.

| Sistema | Responsabilidade |
|---------|-----------------|
| Bling | Estoque, pedidos, fiscal, operação |
| Tribus Hub | Conhecimento, estratégia, planejamento, execução |

## Domínios

- **Knowledge** — Wiki, páginas hierárquicas, editor rico, histórico de revisões
- **Projects** — Objetivos, OKRs, projetos, milestones
- **Tasks** — Board kanban com drag-and-drop, execução do dia a dia
- **Assets** — Upload e gestão de arquivos internos (Cloudflare R2)

## Stack

- **Framework**: Next.js 15 (App Router)
- **Linguagem**: TypeScript strict
- **UI**: Tailwind CSS + Radix UI
- **Editor**: Tiptap
- **Banco**: PostgreSQL + Drizzle ORM
- **Auth**: Auth.js (credentials)
- **Storage**: Cloudflare R2
- **Drag-and-drop**: dnd-kit
- **Testes**: Vitest + Playwright

## Configuração

```bash
# 1. Copiar env
cp .env.example .env.local
# Preencher todos os valores obrigatórios

# 2. Instalar dependências
npm install

# 3. Migrations
npm run db:generate
npm run db:migrate

# 4. Seed inicial (workspace + usuário admin + colunas padrão)
npm run db:seed
# Email: admin@tribus.com.br | Senha: changeme123!

# 5. Desenvolvimento
npm run dev
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `dev` | Servidor de desenvolvimento |
| `build` | Build de produção |
| `typecheck` | Verificação de tipos |
| `lint` | Linting |
| `format` | Formatação |
| `test` | Testes unitários |
| `test:e2e` | Testes E2E (Playwright) |
| `db:generate` | Gerar migrations |
| `db:migrate` | Aplicar migrations |
| `db:seed` | Popular banco inicial |

## Documentação completa

Consulte [`docs/project-context.md`](docs/project-context.md) para visão arquitetural completa.

```
docs/
  project-context.md       # Contexto canônico do projeto
  architecture/            # Camadas, decisões, estrutura
  domains/                 # Documentação por domínio
  flows/                   # Fluxos de execução
  reference/               # Rotas, env vars, glossário
  operations/              # Deploy, seeding
```

## Arquitetura em camadas

```
config → schemas → repositories → integrations → services → routes → UI
```

Nenhuma camada pode acessar a camada abaixo de sua vizinha direta.
`process.env` só pode ser lido em `lib/config/env.ts`.

## CI/CD

- Push/PR → CI: typecheck + lint + format + tests + build
- Merge em `main` → Deploy automático no Vercel
