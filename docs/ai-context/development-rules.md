# Regras de desenvolvimento para IA — Tribus Hub

Este arquivo define **como a IA deve trabalhar** dentro do projeto tribus-hub. Deve ser atualizado quando novas regras ou padrões forem definidos.

---

## 1. Regras de arquitetura

### ❌ Proibido

- Colocar **lógica de negócio** em API routes. Rotas apenas autenticam, validam com Zod, delegam para services e respondem.
- Usar `process.env` fora de `src/lib/config/env.ts`. Todo acesso a variáveis de ambiente deve passar pelos helpers exportados por essa camada.
- **Pular validação com schema.** Toda entrada de API (body, query quando relevante) deve passar por schema Zod em `src/lib/schemas/` com `.safeParse()`.
- **Hard delete** em entidades centrais (pages, projects, tasks). Usar soft delete (campo `isDeleted`, `deletedAt`, `archivedAt`).
- Criar rotas sem chamar `requireAuth()` no topo do handler (exceto rota de login e health check).
- Queries Drizzle fora de `src/lib/repositories/`. Repositórios são o único ponto de contato com o banco.

### ✅ Obrigatório

- **Usar a camada de services** para orquestração e regras de negócio.
- **Usar a camada de repositories** para toda comunicação com o banco (Drizzle). Nunca construir queries em routes.
- **Usar a camada de integrations** para serviços externos (ex.: email).
- **Validar entrada com schemas Zod** em toda rota que recebe body. Schemas em `src/lib/schemas/<domain>.schemas.ts`.
- **Manter separação de responsabilidades:** API routes → auth + validação + delegação; Services → lógica + repos + integrations; Repositories → queries; Integrations → SDKs externos; Schemas → payloads; Config → env vars.
- **Soft delete** nas entidades centrais. Nunca `DELETE FROM` sem uso de campo de flag.
- Usar `cn()` de `@/lib/utils/cn` para mesclagem de classes Tailwind.
- `<DialogTitle className="sr-only">` em todo `<DialogContent>` do Radix.

---

## 2. Regras de documentação

A IA **deve**:

- **Atualizar a documentação** sempre que a mudança no código a impactar.
- Atualizar, conforme o caso:
  - **reference/routes.md** — novas rotas ou mudança de contrato (método, path, auth, erros).
  - **reference/env-vars.md** — novas variáveis ou mudança de obrigatoriedade/escopo.
  - **docs/flows/** — quando o fluxo de um domínio mudar (passos, APIs, services, estado).
  - **docs/domains/** — quando o domínio ganhar ou perder responsabilidades, rotas ou integrações.
  - **docs/architecture/** — quando a estrutura de pastas ou camadas mudarem.
  - **docs/getting-started/**, **docs/integrations/**, **docs/operations/** — quando houver impacto em setup, integrações ou operação (inclui CI/CD).
- **Explicar quando não atualizou:** se nenhum arquivo de documentação for alterado, justificar explicitamente na entrega.

---

## 3. Regras de implementação

- Código **limpo e consistente** com o restante do projeto (nomenclatura, imports, TypeScript strict).
- **Reutilizar** componentes e funções existentes quando fizer sentido; não duplicar lógica presente em services ou integrations.
- **Não quebrar** comportamento existente; alterações devem ser compatíveis com fluxos e contratos atuais, salvo quando a tarefa for explicitamente de breaking change.
- **Manter o padrão do projeto:** alias `@/` para `src/`; arquivos em kebab-case; rotas de API em kebab-case; schemas exportam tipo inferido junto.
- **TypeScript strict:** sem `any` explícito (ESLint bloqueia); usar `unknown` e narrowing; `import type` para tipos.
- **Sem `console.log`** — ESLint avisa. Usar `console.warn`/`console.error` apenas em boundaries de sistema.

---

## 4. Regra de análise antes de codar

Antes de implementar, a IA **deve**:

- **Ler a documentação relevante** ao domínio afetado (domains, flows, integrations, reference).
- **Entender o fluxo impactado** (entrada, passos, APIs, services, estado).
- **Identificar as camadas envolvidas** (config, repositories, integrations, services, API, schemas) e onde a mudança será feita.
- Consultar **AGENTS.md** e **docs/ai-context/project-context.md** para garantir alinhamento com o contexto canônico.

---

## 5. Regra de entrega

Toda entrega **deve** incluir:

- **O que foi feito** — resumo objetivo da tarefa e da solução.
- **Arquivos alterados** — lista de arquivos de código e de documentação modificados ou criados.
- **Impacto na arquitetura** — se houve nova rota, novo service, nova env, novo domínio ou mudança de fluxo; caso contrário, afirmar que não houve impacto arquitetural relevante.
- **Documentação atualizada** — quais documentos em `docs/` foram atualizados (ou justificativa de por que nenhum).
- **Contexto IA atualizado** — se `project-context.md` e/ou `development-rules.md` foram atualizados (ou declaração de que não foi necessário).

---

## 6. Regra de atualização deste próprio arquivo

Atualize **development-rules.md** quando:

- **Novas regras** de arquitetura, documentação ou implementação forem adotadas.
- **Novos padrões** do projeto forem definidos (nomenclatura, estrutura, convenções).
- Houver mudança na **regra de entrega** ou na **regra de análise antes de codar**.

Mantenha o texto em PT-BR, técnico e alinhado a **docs/conventions/** e a **AGENTS.md**.
