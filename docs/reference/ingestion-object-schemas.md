# Schemas de objetos de ingestão — tribus-hub

**Versão:** 1.0  
**Relacionado:** [ingestion-spec.md](./ingestion-spec.md) · **Template IA (único):** [ingestion-ai-master-template.md](./ingestion-ai-master-template.md)

Este documento descreve os campos aceitos em `data` para cada tipo de objeto de ingestão.

---

## `okr_cycle` — Ciclo OKR

```json
{
  "type": "okr_cycle",
  "client_ref": "ciclo_q1",
  "data": {
    "title": "1Q2025",
    "description": "Primeiro trimestre de 2025",
    "start_date": "2025-01-01",
    "end_date": "2025-03-31",
    "status": "planned"
  }
}
```

| Campo | Tipo | Obrigatório | Valores válidos | Padrão |
|-------|------|-------------|-----------------|--------|
| `title` | string | **Sim** | max 200 chars | — |
| `description` | string | Não | max 2000 chars | null |
| `start_date` | string (YYYY-MM-DD) | **Sim** | data válida | — |
| `end_date` | string (YYYY-MM-DD) | **Sim** | data válida | — |
| `status` | enum | Não | `planned`, `active`, `closed`, `archived` | `"planned"` |

---

## `okr_objective` — Objetivo OKR

```json
{
  "type": "okr_objective",
  "client_ref": "obj_crescimento",
  "data": {
    "title": "Acelerar o crescimento da base de clientes",
    "description": "Foco em aquisição e retenção no canal digital",
    "cycle_ref": "ciclo_q1",
    "owner_user_id": "usr_abc123",
    "status": "draft",
    "priority": "high",
    "start_date": "2025-01-01",
    "target_date": "2025-03-31"
  }
}
```

| Campo | Tipo | Obrigatório | Valores válidos | Padrão |
|-------|------|-------------|-----------------|--------|
| `title` | string | **Sim** | max 500 chars | — |
| `description` | string | Não | max 5000 chars | null |
| `cycle_id` | string | Não | ID real de um ciclo existente | null |
| `cycle_ref` | string | Não | client_ref de um `okr_cycle` no payload | null |
| `owner_user_id` | string | Não | ID de usuário válido no workspace | null |
| `status` | enum | Não | `draft`, `on_track`, `at_risk`, `off_track`, `completed` | `"draft"` |
| `priority` | enum | Não | `low`, `medium`, `high`, `critical` | null |
| `start_date` | string (YYYY-MM-DD) | Não | data válida | null |
| `target_date` | string (YYYY-MM-DD) | Não | data válida | null |

**Observações:**
- Forneça `cycle_ref` ou `cycle_id` para associar ao ciclo (não ambos).
- Se nenhum for fornecido, o objetivo fica sem ciclo.

---

## `okr_key_result` — Key Result OKR

```json
{
  "type": "okr_key_result",
  "data": {
    "title": "Atingir 500 novos cadastros",
    "objective_ref": "obj_crescimento",
    "cycle_ref": "ciclo_q1",
    "metric_type": "number",
    "unit": "cadastros",
    "start_value": 0,
    "current_value": 0,
    "target_value": 500,
    "status": "draft",
    "confidence": 70,
    "start_date": "2025-01-01",
    "target_date": "2025-03-31"
  }
}
```

| Campo | Tipo | Obrigatório | Valores válidos | Padrão |
|-------|------|-------------|-----------------|--------|
| `title` | string | **Sim** | max 500 chars | — |
| `description` | string | Não | max 5000 chars | null |
| `objective_id` | string | Cond. | ID real de um objetivo existente | — |
| `objective_ref` | string | Cond. | client_ref de um `okr_objective` no payload | — |
| `cycle_id` | string | Não | ID real de um ciclo existente | null |
| `cycle_ref` | string | Não | client_ref de um `okr_cycle` no payload | null |
| `owner_user_id` | string | Não | ID de usuário válido | null |
| `metric_type` | enum | Não | `percentage`, `number`, `currency`, `boolean`, `custom` | `"number"` |
| `unit` | string | Não | max 50 chars (ex: `"%"`, `"cadastros"`, `"R$"`) | null |
| `start_value` | number | Não | valor inicial da métrica | `0` |
| `current_value` | number | Não | valor atual (geralmente igual ao start_value) | igual ao start |
| `target_value` | number | **Sim** | valor alvo da métrica | — |
| `status` | enum | Não | `draft`, `on_track`, `at_risk`, `off_track`, `completed` | `"draft"` |
| `confidence` | integer 0–100 | Não | nível de confiança em % | null |
| `start_date` | string (YYYY-MM-DD) | Não | data válida | null |
| `target_date` | string (YYYY-MM-DD) | Não | data válida | null |

**Regra obrigatória:** `objective_id` **ou** `objective_ref` deve ser fornecido.

---

## `project` — Projeto

```json
{
  "type": "project",
  "client_ref": "proj_lancamento",
  "data": {
    "title": "Lançamento coleção inverno 2025",
    "summary": "Campanha e infraestrutura para lançamento",
    "status": "planned",
    "health_status": "on_track",
    "priority": "high",
    "owner_user_id": "usr_abc123",
    "start_date": "2025-03-01",
    "target_date": "2025-06-30"
  }
}
```

| Campo | Tipo | Obrigatório | Valores válidos | Padrão |
|-------|------|-------------|-----------------|--------|
| `title` | string | **Sim** | max 500 chars | — |
| `summary` | string | Não | max 1000 chars | null |
| `status` | enum | Não | `planned`, `active`, `on_hold`, `completed`, `cancelled` | `"planned"` |
| `health_status` | enum | Não | `on_track`, `at_risk`, `blocked`, `off_track` | null |
| `priority` | enum | Não | `low`, `medium`, `high`, `urgent` | null |
| `owner_user_id` | string | Não | ID de usuário válido | null |
| `start_date` | string (YYYY-MM-DD) | Não | data válida | null |
| `target_date` | string (YYYY-MM-DD) | Não | data válida | null |

---

## `milestone` — Milestone de projeto

```json
{
  "type": "milestone",
  "client_ref": "ms_landing",
  "data": {
    "title": "Landing page publicada",
    "description": "Página de captura de leads para o lançamento",
    "project_ref": "proj_lancamento",
    "status": "pending",
    "priority": "high",
    "owner_user_id": "usr_abc123",
    "due_date": "2025-05-15"
  }
}
```

| Campo | Tipo | Obrigatório | Valores válidos | Padrão |
|-------|------|-------------|-----------------|--------|
| `title` | string | **Sim** | max 500 chars | — |
| `description` | string | Não | max 2000 chars | null |
| `project_id` | string | Cond. | ID real de um projeto existente | — |
| `project_ref` | string | Cond. | client_ref de um `project` no payload | — |
| `status` | enum | Não | `pending`, `in_progress`, `completed`, `missed` | `"pending"` |
| `priority` | enum | Não | `low`, `medium`, `high`, `urgent` | null |
| `owner_user_id` | string | Não | ID de usuário válido | null |
| `due_date` | string (YYYY-MM-DD) | Não | data válida | null |

**Regra obrigatória:** `project_id` **ou** `project_ref` deve ser fornecido.

---

## `task` — Tarefa

```json
{
  "type": "task",
  "data": {
    "title": "Criar design da landing page",
    "description": "Criar layout responsivo seguindo o brand guide",
    "project_ref": "proj_lancamento",
    "milestone_ref": "ms_landing",
    "column_name": "Em andamento",
    "priority": "high",
    "assignee_user_id": "usr_abc123",
    "due_date": "2025-05-10",
    "label_ids": ["lbl_design", "lbl_frontend"]
  }
}
```

| Campo | Tipo | Obrigatório | Valores válidos | Padrão |
|-------|------|-------------|-----------------|--------|
| `title` | string | **Sim** | max 500 chars | — |
| `description` | string | Não | max 5000 chars | null |
| `project_id` | string | Não | ID real de um projeto existente | null |
| `project_ref` | string | Não | client_ref de um `project` no payload | null |
| `milestone_id` | string | Não | ID real de um milestone existente | null |
| `milestone_ref` | string | Não | client_ref de um `milestone` no payload | null |
| `column_id` | string | Não | ID real de uma coluna do board | padrão do workspace |
| `column_name` | string | Não | Nome ou slug de uma coluna (ex: `"A fazer"`) | padrão do workspace |
| `priority` | enum | Não | `low`, `medium`, `high`, `urgent` | null |
| `assignee_user_id` | string | Não | ID de usuário válido | null |
| `due_date` | string (YYYY-MM-DD) | Não | data válida | null |
| `label_ids` | string[] | Não | IDs de labels existentes no workspace | `[]` |

**Resolução de coluna:**
1. Se `column_id` fornecido → usado diretamente.
2. Se `column_name` fornecido → busca coluna pelo nome ou slug (case-insensitive).
3. Se nenhum → usa a coluna padrão do workspace (`isDefault: true`).
4. Se não houver coluna padrão → usa a primeira coluna por `sortOrder`.

---

## Campos de usuário (owner_user_id, assignee_user_id)

Os campos de usuário aceitam **IDs reais do banco** (ex.: `"usr_abc123"`).

Para descobrir os IDs dos usuários do workspace, use a API:

```
GET /api/workspace/members
```

Atualmente o sistema **não aceita e-mail como identificador de usuário** em payloads de ingestão. Use sempre o ID.

---

## Formatos de data

Todas as datas devem estar no formato **ISO 8601 data**: `YYYY-MM-DD`.

Exemplos válidos:
- `"2025-01-01"`
- `"2025-12-31"`

Exemplos inválidos:
- `"01/01/2025"` ❌
- `"January 1, 2025"` ❌
- `"2025-1-1"` ❌

---

## Exemplos de payloads inválidos

### Falta campo obrigatório

```json
{
  "version": "1.0",
  "mode": "create",
  "objects": [
    {
      "type": "okr_key_result",
      "data": {
        "title": "Atingir 500 cadastros",
        "target_value": 500
      }
    }
  ]
}
```

**Erro:** `objective_id ou objective_ref é obrigatório`

---

### Referência interna quebrada

```json
{
  "version": "1.0",
  "mode": "create",
  "objects": [
    {
      "type": "task",
      "data": {
        "title": "Tarefa X",
        "project_ref": "proj_inexistente"
      }
    }
  ]
}
```

**Erro:** `project_ref "proj_inexistente" não encontrado no payload.`

---

### `client_ref` duplicado

```json
{
  "version": "1.0",
  "mode": "create",
  "objects": [
    {
      "type": "project",
      "client_ref": "meu_projeto",
      "data": { "title": "Projeto A" }
    },
    {
      "type": "project",
      "client_ref": "meu_projeto",
      "data": { "title": "Projeto B" }
    }
  ]
}
```

**Erro:** `client_ref "meu_projeto" duplicado. Cada client_ref deve ser único no payload.`
