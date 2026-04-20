# Domain: Projects

## Propósito

Planejamento estratégico e acompanhamento de iniciativas da Tribus.

## Entidades

- `projects` — iniciativa principal com status, datas e owner
- `objectives` — intenção estratégica (pode ser ligada a um projeto ou ao workspace)
- `key_results` — métricas quantitativas ligadas a um objetivo
- `milestones` — marcos de um projeto, com data e status

## Status de projeto

`planned → active → on_hold / completed / cancelled`

## Relação com outros domínios

- Tarefas referenciam `project_id` e `milestone_id`
- Páginas podem documentar projetos (via relation_links)
- Assets podem ser associados a projetos (via asset_links)

## OKRs

Objectives podem existir:
1. Dentro de um projeto (`project_id` preenchido)
2. Como objetivo de workspace (`project_id` null, `workspace_id` preenchido)

Key results pertencem a um objective e medem progresso numérico: `start_value → current_value → target_value`.
