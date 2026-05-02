# Template mestre de ingestão (IA) — tribus-hub

**Objetivo:** um único documento para colar em outra IA e gerar **um JSON válido** que o Hub aceite na Ingestão (`/api/ingestion/validate` → `/api/ingestion/execute`).

**Versão do contrato:** `1.0`  
**Especificação detalhada:** [ingestion-spec.md](./ingestion-spec.md) · **Campos por tipo:** [ingestion-object-schemas.md](./ingestion-object-schemas.md)

**Formatos complementares (recomendado usar os três em conjunto):**

| Formato                      | Onde                                                                       | Para quê                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Markdown (este ficheiro)** | Repositório                                                                | Contexto humano + prompts para IA                                                                                                               |
| **JSON Schema**              | No app deployado: `/ingestion-payload.schema.json` (ficheiro em `public/`) | Validação em IDE, geradores e IAs que suportam `$schema`                                                                                        |
| **UI “Nova ingestão”**       | Modal no Hub                                                               | Tabelas obrigatório/opcional/condicional e enums por tipo (dados em `src/features/ingestion/lib/ingestion-field-reference.ts`, alinhado ao Zod) |

---

## Instruções para a IA geradora

1. Produza **apenas** um objeto JSON raiz com `version`, `mode` e `objects` (nada de markdown, nada de comentários dentro do JSON).
2. `objects` é uma **lista heterogénea**: cada item tem `type`, `data` e opcionalmente `client_ref`.
3. Use `client_ref` (único no payload) + `*_ref` para ligar objetos criados no **mesmo** JSON (ex.: `project_ref` apontando para o `client_ref` de um `project`).
4. Datas no formato **`YYYY-MM-DD`** (não use `DD/MM/YYYY`).
5. `owner_user_id`, `assignee_user_id`: apenas **IDs de utilizador** já existentes no workspace (não use email como ID).
6. **Não inclua** tipos listados em “Planeado / fora da ingestão v1.0” — o validador **rejeita** tipos desconhecidos.
7. Ao interpretar pedidos em linguagem natural, trate `external_ref` como identificador humano principal (ex.: `PRJ-0007`, `MS-0003`, `TSK-0012`, `CYC-0002`, `OBJ-0008`, `KR-0031`).

---

## Envelope obrigatório (sempre igual)

| Campo     | Tipo   | Obrigatório | Restrições                                   |
| --------- | ------ | ----------- | -------------------------------------------- |
| `version` | string | Sim         | Exatamente `"1.0"`                           |
| `mode`    | string | Sim         | Exatamente `"create"`                        |
| `objects` | array  | Sim         | 1 a 200 itens; cada item com `type` + `data` |

Cada item de `objects`:

| Campo        | Tipo   | Obrigatório | Descrição                                                   |
| ------------ | ------ | ----------- | ----------------------------------------------------------- |
| `type`       | string | Sim         | Um dos tipos **suportados** abaixo                          |
| `client_ref` | string | Não         | Identificador estável **único** neste payload, para `*_ref` |
| `data`       | object | Sim         | Campos específicos do tipo                                  |

---

## Tabela mestre: o que a ingestão v1.0 aceita

| `type`             | Domínio      | Suportado hoje | Notas                                                                                       |
| ------------------ | ------------ | -------------- | ------------------------------------------------------------------------------------------- |
| `okr_cycle`        | OKR          | Sim            | —                                                                                           |
| `okr_objective`    | OKR          | Sim            | Liga a ciclo via `cycle_id` / `cycle_ref`                                                   |
| `okr_key_result`   | OKR          | Sim            | Exige `objective_id` **ou** `objective_ref`                                                 |
| `project`          | Projetos     | Sim            | Ciclo OKR opcional (`cycle_ref` / `cycle_id`); `estimation_unit` para estimativa de tarefas |
| `milestone`        | Projetos     | Sim            | Exige `project_id` **ou** `project_ref`                                                     |
| `task`             | Tarefas      | Sim            | Coluna via `column_id` / `column_name` / padrão do board                                    |
| `knowledge_page`   | Knowledge    | **Não**        | Planeado; ver secção futura                                                                 |
| `knowledge_folder` | Knowledge    | **Não**        | Planeado                                                                                    |
| `task_label`       | Tarefas      | **Não**        | Planeado (criar etiquetas)                                                                  |
| `workspace_member` | Utilizadores | **Não**        | Fora do âmbito da ingestão atual                                                            |

---

## Ordem de criação (automática no servidor)

O Hub **reordena** os objetos antes de criar. A ordem efetiva é:

1. `okr_cycle` → 2. `okr_objective` → 3. `okr_key_result` → 4. `project` → 5. `milestone` → 6. `task`

A ordem no JSON que a IA gerar **pode ser qualquer uma**; referências `*_ref` devem apenas resolver para `client_ref` existentes.

---

## Referências cruzadas (`client_ref` / `*_ref`)

| Objeto filho     | Campo           | Deve apontar para `client_ref` de |
| ---------------- | --------------- | --------------------------------- |
| `okr_objective`  | `cycle_ref`     | `okr_cycle`                       |
| `okr_key_result` | `objective_ref` | `okr_objective`                   |
| `okr_key_result` | `cycle_ref`     | `okr_cycle` (opcional)            |
| `project`        | `cycle_ref`     | `okr_cycle` (opcional)            |
| `milestone`      | `project_ref`   | `project`                         |
| `task`           | `project_ref`   | `project` (opcional)              |
| `task`           | `milestone_ref` | `milestone` (opcional)            |

Alternativa: usar `*_id` com **UUID real** já existente no D1 (não inventar).

### Referência externa (`external_ref`) para elementos existentes

- Cada entidade tem uma referência humana estável no formato `PREFIXO-0001` (4 dígitos fixos).
- Sequência por `workspace` e por tipo de entidade.
- Prefixos atuais:
  - `PRJ-` projetos
  - `MS-` milestones
  - `TSK-` tasks
  - `CYC-` ciclos de OKR
  - `OBJ-` objetivos de OKR
  - `KR-` key results
  - `USR-` usuários
- Em pedidos por voz/texto, a IA deve priorizar esse identificador quando o utilizador disser algo como “liga no projeto PRJ-0012”.

---

## 1. `okr_cycle` — campos em `data`

| Campo         | Obrigatório | Tipo   | Valores / notas                                   |
| ------------- | ----------- | ------ | ------------------------------------------------- |
| `title`       | **Sim**     | string | max 200                                           |
| `start_date`  | **Sim**     | string | `YYYY-MM-DD`                                      |
| `end_date`    | **Sim**     | string | `YYYY-MM-DD`                                      |
| `description` | Não         | string | max 2000                                          |
| `status`      | Não         | enum   | `planned`, `active`, `closed` — default `planned` |

---

## 2. `okr_objective` — campos em `data`

| Campo           | Obrigatório | Tipo   | Valores / notas                                                            |
| --------------- | ----------- | ------ | -------------------------------------------------------------------------- |
| `title`         | **Sim**     | string | max 500                                                                    |
| `description`   | Não         | string | max 5000                                                                   |
| `cycle_id`      | Não\*       | string | ID real do ciclo                                                           |
| `cycle_ref`     | Não\*       | string | `client_ref` de `okr_cycle`                                                |
| `owner_user_id` | Não         | string | ID de utilizador                                                           |
| `status`        | Não         | enum   | `draft`, `on_track`, `at_risk`, `off_track`, `completed` — default `draft` |
| `priority`      | Não         | enum   | `low`, `medium`, `high`, `critical`                                        |
| `start_date`    | Não         | string | `YYYY-MM-DD`                                                               |
| `target_date`   | Não         | string | `YYYY-MM-DD`                                                               |

\*Pode ficar sem ciclo; `cycle_id` / `cycle_ref` são opcionais, mas recomendados.

---

## 3. `okr_key_result` — campos em `data`

| Campo           | Obrigatório | Tipo   | Valores / notas                                                            |
| --------------- | ----------- | ------ | -------------------------------------------------------------------------- |
| `title`         | **Sim**     | string | max 500                                                                    |
| `target_value`  | **Sim**     | number | —                                                                          |
| `objective_id`  | **Cond.**   | string | Obrigatório **a menos que** exista `objective_ref`                         |
| `objective_ref` | **Cond.**   | string | `client_ref` de `okr_objective` no mesmo payload                           |
| `description`   | Não         | string | max 5000                                                                   |
| `cycle_id`      | Não         | string | ID real                                                                    |
| `cycle_ref`     | Não         | string | `client_ref` de `okr_cycle`                                                |
| `owner_user_id` | Não         | string | ID de utilizador                                                           |
| `metric_type`   | Não         | enum   | `percentage`, `number`, `currency`, `boolean`, `custom` — default `number` |
| `unit`          | Não         | string | max 50                                                                     |
| `start_value`   | Não         | number | default `0`                                                                |
| `current_value` | Não         | number | default igual a `start_value`                                              |
| `status`        | Não         | enum   | `draft`, `on_track`, `at_risk`, `off_track`, `completed` — default `draft` |
| `start_date`    | Não         | string | `YYYY-MM-DD`                                                               |
| `target_date`   | Não         | string | `YYYY-MM-DD`                                                               |
| `confidence`    | Não         | number | 0 a 100; omitido → API usa 50                                              |
| `sort_order`    | Não         | number | ordem na lista de KRs; omitido → 0                                         |

---

## 4. `project` — campos em `data`

| Campo                | Obrigatório | Tipo   | Valores / notas                                                                 |
| -------------------- | ----------- | ------ | ------------------------------------------------------------------------------- |
| `title`              | **Sim**     | string | max 500                                                                         |
| `summary`            | Não         | string | max 1000                                                                        |
| `status`             | Não         | enum   | `planned`, `active`, `on_hold`, `completed`, `cancelled` — default `planned`    |
| `health_status`      | Não         | enum   | `on_track`, `at_risk`, `blocked`, `off_track`                                   |
| `priority`           | Não         | enum   | `low`, `medium`, `high`, `urgent`                                               |
| `owner_user_id`      | Não         | string | ID de utilizador                                                                |
| `cycle_id`           | Não         | string | ID real de ciclo OKR                                                            |
| `cycle_ref`          | Não         | string | `client_ref` de `okr_cycle` no mesmo payload                                    |
| `cycle_external_ref` | Não         | string | Ref. humana de ciclo existente (ex.: `CYC-0001`)                                |
| `estimation_unit`    | Não         | enum   | `hours`, `story_points` — default `hours` (coerência com estimativas de `task`) |
| `start_date`         | Não         | string | `YYYY-MM-DD`                                                                    |
| `target_date`        | Não         | string | `YYYY-MM-DD`                                                                    |

---

## 5. `milestone` — campos em `data`

| Campo           | Obrigatório | Tipo   | Valores / notas                                                                |
| --------------- | ----------- | ------ | ------------------------------------------------------------------------------ |
| `title`         | **Sim**     | string | max 500                                                                        |
| `project_id`    | **Cond.**   | string | Obrigatório **a menos que** exista `project_ref`                               |
| `project_ref`   | **Cond.**   | string | `client_ref` de `project`                                                      |
| `description`   | Não         | string | max 2000                                                                       |
| `status`        | Não         | enum   | `pending`, `in_progress`, `completed`, `missed`, `blocked` — default `pending` |
| `priority`      | Não         | enum   | `low`, `medium`, `high`, `urgent` — default no API: `medium` se omitido        |
| `owner_user_id` | Não         | string | ID de utilizador                                                               |
| `due_date`      | Não         | string | `YYYY-MM-DD`                                                                   |

---

## 6. `task` — campos em `data`

| Campo              | Obrigatório | Tipo     | Valores / notas                                      |
| ------------------ | ----------- | -------- | ---------------------------------------------------- |
| `title`            | **Sim**     | string   | max 500                                              |
| `description`      | Não         | string   | max 5000 → enviado como texto da tarefa              |
| `project_id`       | Não         | string   | ID real                                              |
| `project_ref`      | Não         | string   | `client_ref` de `project`                            |
| `milestone_id`     | Não         | string   | ID real                                              |
| `milestone_ref`    | Não         | string   | `client_ref` de `milestone`                          |
| `column_id`        | Não         | string   | ID da coluna do board                                |
| `column_name`      | Não         | string   | Nome ou slug da coluna (match case-insensitive)      |
| `priority`         | Não         | enum     | `low`, `medium`, `high`, `urgent`                    |
| `assignee_user_id` | Não         | string   | ID de utilizador                                     |
| `due_date`         | Não         | string   | `YYYY-MM-DD`                                         |
| `label_ids`        | Não         | string[] | IDs de labels **já existentes** no workspace         |
| `estimated_hours`  | Não         | number   | Quando o projeto usa `estimation_unit: hours`        |
| `estimated_points` | Não         | number   | Quando o projeto usa `estimation_unit: story_points` |

A API valida estimativas face a `estimation_unit` do projeto; valores incoerentes podem ser rejeitados.

Resolução de coluna: `column_id` → senão `column_name` → senão coluna default → senão primeira por `sortOrder`. Sem colunas disponíveis, a criação falha.

---

## Exemplo único mínimo (todos os tipos num só `objects`)

Copiável para testar o validador; substitua datas e IDs reais onde fizer sentido.

```json
{
  "version": "1.0",
  "mode": "create",
  "objects": [
    {
      "type": "okr_cycle",
      "client_ref": "c_exemplo",
      "data": {
        "title": "Ciclo exemplo",
        "start_date": "2025-01-01",
        "end_date": "2025-03-31",
        "status": "planned"
      }
    },
    {
      "type": "okr_objective",
      "client_ref": "o_exemplo",
      "data": {
        "title": "Objetivo exemplo",
        "cycle_ref": "c_exemplo",
        "status": "draft",
        "priority": "high"
      }
    },
    {
      "type": "okr_key_result",
      "data": {
        "title": "KR exemplo",
        "objective_ref": "o_exemplo",
        "cycle_ref": "c_exemplo",
        "metric_type": "number",
        "start_value": 0,
        "target_value": 100
      }
    },
    {
      "type": "project",
      "client_ref": "p_exemplo",
      "data": {
        "title": "Projeto exemplo",
        "summary": "Resumo opcional",
        "status": "planned",
        "priority": "medium",
        "cycle_ref": "c_exemplo",
        "estimation_unit": "hours"
      }
    },
    {
      "type": "milestone",
      "client_ref": "m_exemplo",
      "data": {
        "title": "Milestone exemplo",
        "project_ref": "p_exemplo",
        "status": "pending"
      }
    },
    {
      "type": "task",
      "data": {
        "title": "Tarefa exemplo",
        "project_ref": "p_exemplo",
        "milestone_ref": "m_exemplo",
        "priority": "medium",
        "estimated_hours": 8
      }
    }
  ]
}
```

---

## Planeado / fora da ingestão v1.0 (não enviar no JSON ainda)

O Hub tem APIs para Knowledge (páginas com conteúdo rico/HTML via TipTap, pastas, revisões, etc.), mas **não** existem entradas `type` correspondentes no schema Zod de ingestão. Para evitar erros 400, **não** inclua blocos como os abaixo até uma versão futura (`1.1+`) documentar o contrato oficial.

**Formato conceitual futuro (não contratual):**

- **`knowledge_page`**: `title`, `slug`, `parent_page_id` ou `parent_ref`, `body_html` ou `description_json`, `workspace` implícito.
- **`knowledge_folder` / hierarquia**: agrupar páginas por `parent_page_id` ou tipo `knowledge_section`.
- **`task_label`**: `name`, `color` — criação de etiquetas para depois referenciar em `task.label_ids`.
- **`asset` / anexos**: uploads exigem fluxo R2; ingestão estruturada diferente.

Quando esses tipos forem implementados, atualize este ficheiro e `ingestion.schemas.ts` em conjunto.

---

## Prompt curto para colar noutra IA

```
Gera um JSON válido para a ingestão tribus-hub versão 1.0 (mode create).
Segue EXATAMENTE o contrato do ficheiro "ingestion-ai-master-template.md":
- envelope com version "1.0", mode "create", objects array;
- apenas os types: okr_cycle, okr_objective, okr_key_result, project, milestone, task;
- client_ref únicos; *_ref apontando para client_ref corretos;
- datas YYYY-MM-DD; user fields só com UUIDs reais se usares owner_user_id/assignee_user_id.

Requisito do utilizador: <DESCREVE AQUI O QUE QUERES CRIAR>
```

Substitua a última linha pelo pedido em linguagem natural.
