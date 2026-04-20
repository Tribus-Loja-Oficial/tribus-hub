# Folder Structure

```
tribus-hub/
├── .github/
│   └── workflows/
│       ├── ci.yml                  # typecheck, lint, test, build
│       └── deploy-production.yml   # deploy no Vercel após CI verde
├── docs/
│   ├── project-context.md          # contexto canônico (leia primeiro)
│   ├── architecture/               # visão geral, camadas, decisões
│   ├── domains/                    # knowledge, projects, tasks, assets, auth
│   ├── flows/                      # fluxos de execução
│   ├── reference/                  # rotas, env vars, glossário
│   └── operations/                 # deploy, seeding
├── scripts/
│   └── seed.ts                     # entry point do seed
├── src/
│   ├── app/
│   │   ├── layout.tsx              # root layout
│   │   ├── providers.tsx           # QueryClient + SessionProvider
│   │   ├── middleware.ts           # auth guard global
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # sidebar + header (requer auth)
│   │   │   ├── page.tsx            # home
│   │   │   ├── knowledge/
│   │   │   ├── projects/
│   │   │   ├── tasks/
│   │   │   ├── assets/
│   │   │   └── settings/
│   │   └── api/
│   │       ├── auth/[...nextauth]/ # Auth.js handlers
│   │       ├── knowledge/          # pages, tree
│   │       ├── projects/           # projects, milestones
│   │       ├── tasks/              # tasks, board, move
│   │       ├── task-columns/       # columns, reorder
│   │       ├── assets/             # upload, list, get, delete, link
│   │       ├── search/             # busca global
│   │       └── health/             # health check
│   ├── components/
│   │   ├── ui/                     # Button, Input, Label, Badge, Dialog
│   │   ├── layout/                 # AppSidebar, AppHeader, UserMenu
│   │   ├── editor/                 # RichEditor, EditorToolbar
│   │   └── board/                  # KanbanBoard, KanbanColumn, TaskCard
│   ├── features/
│   │   ├── knowledge/components/   # KnowledgeListPage, PageDetailView
│   │   ├── projects/components/    # ProjectsListPage
│   │   ├── tasks/components/       # TaskBoardPage
│   │   ├── assets/components/      # AssetsPage
│   │   ├── search/                 # SearchModal
│   │   └── auth/components/        # LoginForm
│   ├── lib/
│   │   ├── auth/index.ts           # Auth.js config
│   │   ├── config/                 # env, app-config, feature-flags
│   │   ├── db/
│   │   │   ├── client.ts           # conexão Drizzle
│   │   │   ├── schema/             # um arquivo por domínio
│   │   │   ├── migrations/         # arquivos SQL gerados
│   │   │   └── seeds/seed.ts       # seed inicial
│   │   ├── repositories/           # acesso ao banco por domínio
│   │   ├── integrations/r2/        # R2 client + service
│   │   ├── services/               # regra de negócio
│   │   ├── schemas/                # Zod schemas de input de API
│   │   ├── permissions/index.ts    # guards e helpers
│   │   ├── observability/logger.ts # logger estruturado
│   │   ├── errors/index.ts         # AppError hierarchy
│   │   └── utils/                  # ids, cn, content, use-debounce
│   └── styles/globals.css          # CSS tokens + Tailwind
├── tests/
│   ├── e2e/                        # Playwright specs
│   ├── unit/                       # Vitest unit tests
│   └── fixtures/                   # setup.ts + test-data.ts
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── drizzle.config.ts
├── next.config.ts
├── package.json
├── playwright.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```
