# Especificação de Ingestão Estruturada — tribus-hub

**Versão:** 1.0  
**Domínio:** Ingestão de dados  
**Status:** Estável

---

## Visão geral

A funcionalidade de **Ingestão** permite criar entidades do sistema em lote a partir de um único objeto JSON estruturado. É um recurso nativo do produto, projetado tanto para uso humano direto quanto para integração com IA externa.

O usuário acessa a interface de Ingestão pelo botão **"Ingestão"** no cabeçalho global, cola ou escreve um JSON, valida o conteúdo e executa a criação em lote.

### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/ingestion/validate` | Valida o payload sem criar objetos |
| POST | `/api/ingestion/execute` | Valida e executa a criação em lote |

**Autorização:** `role >= admin`. Membros comuns não têm acesso.

---

## Envelope do payload de ingestão

Todo payload de ingestão deve seguir este envelope obrigatório:

```json
{
  "version": "1.0",
  "mode": "create",
  "objects": [ ... ]
}
```

### Campos do envelope

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `version` | `"1.0"` | Sim | Versão do schema. Atualmente apenas `"1.0"` |
| `mode` | `"create"` | Sim | Operação a executar. Atualmente apenas `"create"` |
| `objects` | array | Sim | Lista de objetos a ingerir. Mínimo 1, máximo 200 |

---

## Estrutura de cada objeto

Cada item do array `objects` segue este padrão:

```json
{
  "type": "<tipo_do_objeto>",
  "client_ref": "<referência_interna_opcional>",
  "data": { ... }
}
```

### Campos do objeto

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `type` | string | Sim | Tipo do objeto. Ver lista de tipos suportados |
| `client_ref` | string | Não | Referência interna única no payload. Usada para vincular objetos entre si |
| `data` | object | Sim | Dados específicos do tipo. Ver schemas por tipo |

---

## Tipos suportados

| Tipo | Descrição |
|------|-----------|
| `okr_cycle` | Ciclo OKR |
| `okr_objective` | Objetivo OKR |
| `okr_key_result` | Key Result OKR |
| `project` | Projeto |
| `milestone` | Milestone de projeto |
| `task` | Tarefa |

---

## Sistema de referências internas (client_ref)

Para criar objetos que dependem de outros objetos criados no mesmo payload, use `client_ref` no objeto pai e `<tipo>_ref` no objeto filho.

**Exemplo: criar um objetivo e KRs vinculados no mesmo payload:**

```json
{
  "version": "1.0",
  "mode": "create",
  "objects": [
    {
      "type": "okr_objective",
      "client_ref": "obj_crescimento",
      "data": {
        "title": "Acelerar o crescimento",
        "status": "draft"
      }
    },
    {
      "type": "okr_key_result",
      "data": {
        "title": "500 novos cadastros",
        "objective_ref": "obj_crescimento",
        "target_value": 500,
        "metric_type": "number"
      }
    }
  ]
}
```

### Regras das referências

1. **`client_ref` deve ser único** no payload. Duplicatas geram erro de validação.
2. **`<tipo>_ref` deve apontar para um `client_ref` existente no mesmo payload**, exceto quando o campo `<tipo>_id` estiver preenchido com um ID real do banco.
3. **A referência deve apontar para o tipo correto.** `objective_ref` deve apontar para um objeto `okr_objective`, por exemplo.
4. **Se `<tipo>_id` e `<tipo>_ref` forem ambos fornecidos**, `<tipo>_ref` tem prioridade durante a execução (é resolvido para o ID real criado no mesmo payload).

### Campos de referência por tipo

| No objeto | Campo de referência | Aponta para tipo |
|-----------|-------------------|-----------------|
| `okr_objective` | `cycle_ref` | `okr_cycle` |
| `okr_key_result` | `objective_ref` | `okr_objective` |
| `okr_key_result` | `cycle_ref` | `okr_cycle` |
| `milestone` | `project_ref` | `project` |
| `task` | `project_ref` | `project` |
| `task` | `milestone_ref` | `milestone` |

---

## Ordem de criação

Os objetos são criados na seguinte ordem, independentemente da ordem no payload:

1. `okr_cycle`
2. `okr_objective`
3. `okr_key_result`
4. `project`
5. `milestone`
6. `task`

Isso garante que as dependências sejam criadas antes dos dependentes.

---

## Resposta da validação (`POST /api/ingestion/validate`)

```json
{
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [],
    "summary": {
      "total": 4,
      "byType": {
        "okr_cycle": 1,
        "okr_objective": 1,
        "okr_key_result": 2
      }
    }
  }
}
```

### Resposta com erros

```json
{
  "data": {
    "valid": false,
    "errors": [
      {
        "objectIndex": 2,
        "objectType": "okr_key_result",
        "clientRef": null,
        "field": "data.objective_ref",
        "message": "objective_ref \"obj_xyz\" não encontrado no payload. Adicione um objeto okr_objective com esse client_ref ou use objective_id com um ID real."
      }
    ],
    "warnings": [],
    "summary": { ... }
  }
}
```

---

## Resposta da execução (`POST /api/ingestion/execute`)

**HTTP 200** — todos criados  
**HTTP 207** — criação parcial (alguns criados, alguns falharam)  
**HTTP 422** — nenhum criado  
**HTTP 400** — payload com formato inválido  
**HTTP 403** — usuário sem permissão

```json
{
  "data": {
    "total": 4,
    "created": 4,
    "failed": 0,
    "items": [
      {
        "index": 0,
        "type": "okr_cycle",
        "clientRef": "ciclo_q1",
        "status": "created",
        "id": "cid_abc123"
      },
      {
        "index": 1,
        "type": "okr_objective",
        "clientRef": "obj_crescimento",
        "status": "created",
        "id": "obj_xyz456"
      }
    ],
    "refMap": {
      "ciclo_q1": "cid_abc123",
      "obj_crescimento": "obj_xyz456"
    }
  }
}
```

### `refMap`

O `refMap` mapeia cada `client_ref` para o ID real gerado no banco. Útil para referenciar os objetos criados após a ingestão.

---

## Modo transacional

A ingestão **não é totalmente transacional** a nível de banco de dados, porque os objetos são criados via chamadas separadas ao hub-api.

**Comportamento:**
- Se o payload tiver erros de validação (estrutural ou semântico), **nenhum objeto é criado**.
- Se a criação de um objeto falhar durante a execução, os objetos já criados antes dele **permanecem no banco**.
- O sistema retorna `HTTP 207` e detalha o que foi criado e o que falhou.

**Estratégia recomendada:** sempre validar antes de executar. A interface faz isso automaticamente.

---

## Segurança e auditoria

- Endpoint protegido por `requireRole("admin")`.
- Toda operação de validação e execução é registrada no sistema de auditoria com:
  - Usuário executor
  - Data/hora
  - Contagem de objetos
  - Tipos afetados
  - Resultado (válido/inválido, criados/falharam)

---

## Limites

| Limite | Valor |
|--------|-------|
| Objetos por payload | máx. 200 |
| Tamanho do payload | limitado pelo Next.js (padrão 4MB) |
| Rate limit | herdado do hub-api |

---

## Exemplo completo — OKR + Projeto vinculado

```json
{
  "version": "1.0",
  "mode": "create",
  "objects": [
    {
      "type": "okr_cycle",
      "client_ref": "ciclo_s1_2025",
      "data": {
        "title": "Semestre 1 — 2025",
        "start_date": "2025-01-01",
        "end_date": "2025-06-30",
        "status": "active"
      }
    },
    {
      "type": "okr_objective",
      "client_ref": "obj_lancamento",
      "data": {
        "title": "Lançar nova linha de produtos até junho",
        "cycle_ref": "ciclo_s1_2025",
        "priority": "critical",
        "status": "draft"
      }
    },
    {
      "type": "okr_key_result",
      "data": {
        "title": "Publicar ao menos 3 lançamentos no catálogo",
        "objective_ref": "obj_lancamento",
        "cycle_ref": "ciclo_s1_2025",
        "metric_type": "number",
        "unit": "lançamentos",
        "start_value": 0,
        "target_value": 3
      }
    },
    {
      "type": "project",
      "client_ref": "proj_colecao_inverno",
      "data": {
        "title": "Coleção Inverno 2025",
        "summary": "Desenvolvimento e lançamento da coleção inverno",
        "status": "planned",
        "priority": "high"
      }
    },
    {
      "type": "milestone",
      "client_ref": "ms_catalogo",
      "data": {
        "title": "Catálogo publicado no site",
        "project_ref": "proj_colecao_inverno",
        "due_date": "2025-06-01",
        "status": "pending"
      }
    },
    {
      "type": "task",
      "data": {
        "title": "Fotografar produtos da coleção",
        "project_ref": "proj_colecao_inverno",
        "milestone_ref": "ms_catalogo",
        "priority": "high"
      }
    }
  ]
}
```

---

## Uso com IA

Esta especificação foi projetada para ser usada como contexto em conversas com IA (ex.: ChatGPT, Claude).

**Prompt de exemplo:**

> Com base na especificação de ingestão do tribus-hub (versão 1.0), gere um payload JSON para criar um ciclo OKR do segundo semestre de 2025, com 2 objetivos e 3 key results cada, focados em crescimento de receita e retenção de clientes.

A IA pode gerar o JSON diretamente com base nesta documentação. O usuário então cola no painel de Ingestão, valida e executa.

---

## Evolução futura

- Suporte a `mode: "update"` (atualização em lote)
- Suporte a knowledge pages
- Suporte a assets e links entre entidades
- Templates gerados por IA dentro da interface
- Histórico de ingestões executadas
