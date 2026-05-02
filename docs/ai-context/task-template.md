# Template padrão de tarefa para IA

Use este template como **modelo de prompt** ao solicitar tarefas a uma IA no repositório tribus-hub. Copie, preencha a seção **Tarefa** e opcionalmente ajuste as regras e a entrega.

---

## Bloco para colar no prompt

```markdown
Leia antes de começar:

- AGENTS.md (na raiz do tribus-hub)
- docs/ai-context/project-context.md
- docs/ai-context/development-rules.md
- docs/README.md

Leia também toda a documentação relevante do domínio afetado (domains, flows, integrations, reference, architecture — conforme o escopo da tarefa).

---

Tarefa:
[Descrever aqui a tarefa com clareza: objetivo, escopo, restrições e critérios de aceite quando aplicável.]

---

Regras:

- Respeitar a arquitetura existente (config → repositories/integrations → services → API; schemas para validação).
- Não acessar process.env fora de src/lib/config/env.ts.
- Toda rota protegida com requireAuth(); toda entrada validada com Zod.
- Soft delete obrigatório em pages, projects, tasks (nunca hard delete).
- Manter os padrões do projeto (TypeScript strict, nomenclatura, separação de camadas).
- Atualizar a documentação impactada (domains, flows, reference, architecture, getting-started, integrations, operations).
- Se nenhuma doc precisar mudar, explicar explicitamente por quê.

---

Entrega obrigatória:

1. Arquivos de código alterados (lista).
2. Resumo das mudanças (o que foi feito e por quê).
3. Arquivos de documentação alterados (lista ou justificativa de por que nenhum).
4. Arquivos de contexto IA atualizados (project-context.md, development-rules.md — ou declaração de que não foi necessário).
5. Pendências ou breaking changes (se houver).
```

---

## Exemplo preenchido

```markdown
Leia antes de começar:

- AGENTS.md
- docs/ai-context/project-context.md
- docs/ai-context/development-rules.md
- docs/README.md

Leia também a documentação do domínio de tasks e do board: docs/domains/tasks.md, docs/flows/task-board-flow.md, docs/reference/routes.md.

---

Tarefa:
Adicionar um campo `dueDate` com notificação visual no card do kanban quando a tarefa estiver atrasada (dueDate < hoje). Exibir um badge vermelho no card. O campo já existe no schema Drizzle e na API, mas não está sendo exibido na UI.

Regras:

- Alterar apenas o componente de card do kanban e o hook que carrega os dados do board.
- Não adicionar nova rota ou campo no banco.
- Manter o padrão de componentes Server/Client e uso de cn() para classes.
- Nenhuma doc de domínio precisa mudar, mas verificar se reference/routes.md está atualizado (não precisa neste caso).

Entrega obrigatória:

1. Arquivos de código alterados
2. Resumo das mudanças
3. Arquivos de documentação alterados (ou justificativa)
4. Arquivos de contexto IA atualizados (ou declaração)
5. Pendências (se houver)
```

---

## Uso com IAs externas

Para usar com Claude, ChatGPT ou outra IA fora do Cursor:

1. Copie o conteúdo de **AGENTS.md**, **project-context.md** e **development-rules.md** (ou forneça os caminhos e peça para considerar como contexto).
2. Use o **task-template.md** como base do prompt, preenchendo a seção **Tarefa**.
3. Solicite explicitamente a **entrega obrigatória** (arquivos alterados, resumo, docs, contexto IA, pendências).

Os arquivos em `docs/ai-context/` foram pensados para serem autocontidos e reutilizáveis como contexto canônico em qualquer ferramenta de IA.
