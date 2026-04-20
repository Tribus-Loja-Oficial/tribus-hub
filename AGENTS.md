# Guia obrigatório para IA — Tribus Hub

Este arquivo é o **contrato de trabalho** e o **guia obrigatório** que toda IA (Cursor, Claude, etc.) deve seguir antes e durante qualquer implementação no repositório **tribus-hub**.

---

## 1. Contexto do projeto (resumo)

- **O que é o tribus-hub:** plataforma interna central da Tribus. Next.js 15 App Router, TypeScript, Drizzle ORM, Auth.js, Tailwind CSS, Tiptap, dnd-kit. Organiza conhecimento, projetos, tarefas e assets da empresa.
- **Papel:** fonte de verdade estratégica, documental e operacional interna. Não replica dados do Bling (ERP). Documenta, organiza e planeja.
- **Arquitetura em camadas:** config → schemas → repositories → integrations → services → API routes → UI. Cada camada tem responsabilidade única e estrita.

---

## 2. Leitura obrigatória antes de qualquer tarefa

A IA **deve sempre** ler, nesta ordem:

1. **docs/ai-context/project-context.md** — contexto canônico do projeto.
2. **docs/ai-context/development-rules.md** — regras de desenvolvimento e documentação.
3. **docs/README.md** — índice da documentação e navegação por objetivo.

Além disso, ler **toda a documentação relevante ao domínio da tarefa**:

- **Domínio afetado:** `docs/domains/*` (knowledge, projects, tasks, assets, auth).
- **Fluxos impactados:** `docs/flows/*` (auth-flow, page-editing-flow, task-board-flow, file-upload-flow, project-management-flow).
- **Integrações envolvidas:** `docs/integrations/*` (r2, auth, drizzle-postgres).
- **Arquitetura:** `docs/architecture/*` (overview, layers, folder-structure, decisions).
- **Referência:** `docs/reference/routes.md`, `docs/reference/env-vars.md` quando a tarefa envolver rotas ou variáveis de ambiente.
- **Convenções:** `docs/conventions/code.md`, `docs/conventions/security.md`.

---

## 3. Regras obrigatórias de desenvolvimento

- **Respeitar a arquitetura existente.** Não criar atalhos fora das camadas.
- **Separação estrita:**  
  **config** → **repositories / integrations** → **services** → **API routes**  
  (schemas validam na entrada da API; errors e observabilidade são transversais.)
- **Não acessar `process.env` fora de** `src/lib/config/env.ts`. Usar apenas helpers exportados por essa camada.
- **Validar todos os inputs com Zod.** Toda rota que recebe body deve usar um schema em `src/lib/schemas/` com `.safeParse()` antes de chamar services.
- **Lógica de negócio em services.** API routes apenas autenticam, validam, delegam para `src/lib/services/` e respondem.
- **Toda rota protegida com `requireAuth()`.** Não confiar em estado do client para autorização.
- **Soft delete obrigatório** nas entidades centrais (pages, projects, tasks). Nunca `DELETE` hard em produção.
- **R2 acessado apenas via** `src/lib/integrations/r2/`. Nunca usar S3 SDK diretamente em rotas ou services.

Detalhes completos: **docs/conventions/code.md** e **docs/conventions/security.md**.

---

## 4. Regra obrigatória de documentação

A IA **deve**:

- **Sempre** verificar se a mudança no código impacta a documentação.
- **Atualizar automaticamente** os documentos afetados em:
  - `docs/domains/*`
  - `docs/flows/*`
  - `docs/reference/*` (routes.md, env-vars.md)
  - `docs/architecture/*`
  - `docs/getting-started/*`
  - `docs/integrations/*`
  - `docs/operations/*`
- **Se nenhuma documentação precisar ser alterada,** explicar **explicitamente** por quê na entrega (ex.: "Nenhuma doc alterada: apenas refatoração interna sem nova rota, env ou fluxo.").

---

## 5. Regra de atualização dos arquivos de contexto para IA

**Crítico:** a IA deve **manter atualizados** os arquivos de contexto para IA sempre que:

- a arquitetura mudar (novas camadas, mudança de responsabilidades);
- novos fluxos forem criados ou fluxos existentes forem alterados de forma relevante;
- novas convenções ou regras de desenvolvimento forem adotadas;
- novas integrações ou rotas forem adicionadas de forma que mudem o resumo do projeto.

Arquivos a manter atualizados:

- **docs/ai-context/project-context.md** — visão geral, camadas, pastas, domínios, fluxos, integrações, auth, regras críticas e links para docs completas.
- **docs/ai-context/development-rules.md** — regras de arquitetura, documentação, implementação, análise antes de codar e entrega.

Quando não houver mudança nesses arquivos, indicar na entrega: "Contexto IA: nenhuma alteração (motivo: …)."

---

## 6. Checklist obrigatório de entrega

Toda resposta da IA ao concluir uma tarefa **deve** terminar com:

1. **Arquivos de código alterados** — lista dos arquivos modificados ou criados no código-fonte.
2. **Arquivos de documentação alterados** — lista dos arquivos em `docs/` atualizados (ou justificativa explícita de por que nenhum foi alterado).
3. **Arquivos de contexto IA atualizados** — `project-context.md` e/ou `development-rules.md` se aplicável (ou declaração de que não foi necessário).
4. **Explicação de impactos** — resumo do impacto na arquitetura, em fluxos existentes e em convenções (se houver).

---

## Princípios gerais do sistema

- **Documentação é parte do código.** Toda mudança relevante no código deve refletir na documentação.
- **Contexto IA é canônico.** Os arquivos em `docs/ai-context/` devem estar sempre alinhados ao estado atual do projeto.
- **AGENTS.md é obrigatório.** Deve ser lido antes de qualquer tarefa.
- **Nada de "quick hacks".** Toda implementação deve respeitar a arquitetura e as convenções.
- **Atualização contínua.** Documentação e contexto para IA evoluem junto com o projeto.

Para o template padrão de tarefas, use **docs/ai-context/task-template.md**.
