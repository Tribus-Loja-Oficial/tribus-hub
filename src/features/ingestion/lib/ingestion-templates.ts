export type IngestionTemplate = {
  id: string;
  label: string;
  description: string;
  payload: object;
};

export const INGESTION_TEMPLATES: IngestionTemplate[] = [
  {
    id: "all_types_minimal",
    label: "Todos os tipos (mínimo, um JSON)",
    description:
      "Um único payload com um exemplo de cada type suportado (OKR + projeto + milestone + tarefa). Ideal para copiar a outra IA como referência. Ver docs/reference/ingestion-ai-master-template.md.",
    payload: {
      version: "1.0",
      mode: "create",
      objects: [
        {
          type: "okr_cycle",
          client_ref: "c_exemplo",
          data: {
            title: "Ciclo exemplo",
            start_date: "2025-01-01",
            end_date: "2025-03-31",
            status: "planned",
          },
        },
        {
          type: "okr_objective",
          client_ref: "o_exemplo",
          data: {
            title: "Objetivo exemplo",
            cycle_ref: "c_exemplo",
            status: "draft",
            priority: "high",
          },
        },
        {
          type: "okr_key_result",
          data: {
            title: "KR exemplo",
            objective_ref: "o_exemplo",
            cycle_ref: "c_exemplo",
            metric_type: "number",
            start_value: 0,
            target_value: 100,
          },
        },
        {
          type: "project",
          client_ref: "p_exemplo",
          data: {
            title: "Projeto exemplo",
            summary: "Resumo opcional",
            status: "planned",
            priority: "medium",
            cycle_ref: "c_exemplo",
            estimation_unit: "hours",
          },
        },
        {
          type: "milestone",
          client_ref: "m_exemplo",
          data: {
            title: "Milestone exemplo",
            project_ref: "p_exemplo",
            status: "pending",
          },
        },
        {
          type: "task",
          data: {
            title: "Tarefa exemplo",
            project_ref: "p_exemplo",
            milestone_ref: "m_exemplo",
            priority: "medium",
            estimated_hours: 8,
          },
        },
      ],
    },
  },
  {
    id: "okr_cycle_with_objectives",
    label: "Ciclo OKR + Objetivos + KRs",
    description: "Cria um ciclo completo com objetivos e key results vinculados",
    payload: {
      version: "1.0",
      mode: "create",
      objects: [
        {
          type: "okr_cycle",
          client_ref: "ciclo_q1",
          data: {
            title: "1Q2025",
            description: "Primeiro trimestre de 2025",
            start_date: "2025-01-01",
            end_date: "2025-03-31",
            status: "planned",
          },
        },
        {
          type: "okr_objective",
          client_ref: "obj_crescimento",
          data: {
            title: "Acelerar o crescimento da base de clientes",
            description: "Foco em aquisição e retenção no canal digital",
            cycle_ref: "ciclo_q1",
            status: "draft",
            priority: "high",
          },
        },
        {
          type: "okr_key_result",
          data: {
            title: "Atingir 500 novos cadastros no e-commerce",
            objective_ref: "obj_crescimento",
            cycle_ref: "ciclo_q1",
            metric_type: "number",
            unit: "cadastros",
            start_value: 0,
            target_value: 500,
            status: "draft",
          },
        },
        {
          type: "okr_key_result",
          data: {
            title: "Taxa de retenção mensal acima de 80%",
            objective_ref: "obj_crescimento",
            cycle_ref: "ciclo_q1",
            metric_type: "percentage",
            unit: "%",
            start_value: 65,
            target_value: 80,
            status: "draft",
          },
        },
      ],
    },
  },
  {
    id: "project_with_milestones_tasks",
    label: "Projeto + Milestones + Tarefas",
    description: "Cria um projeto completo com milestones e tarefas vinculadas",
    payload: {
      version: "1.0",
      mode: "create",
      objects: [
        {
          type: "project",
          client_ref: "proj_lancamento",
          data: {
            title: "Lançamento coleção inverno 2025",
            summary: "Campanha e infraestrutura para lançamento da coleção inverno",
            status: "planned",
            priority: "high",
          },
        },
        {
          type: "milestone",
          client_ref: "ms_landing",
          data: {
            title: "Landing page publicada",
            project_ref: "proj_lancamento",
            status: "pending",
            due_date: "2025-05-15",
          },
        },
        {
          type: "milestone",
          client_ref: "ms_campanha",
          data: {
            title: "Campanha de marketing ativa",
            project_ref: "proj_lancamento",
            status: "pending",
            due_date: "2025-05-20",
          },
        },
        {
          type: "task",
          data: {
            title: "Criar design da landing page",
            project_ref: "proj_lancamento",
            milestone_ref: "ms_landing",
            priority: "high",
          },
        },
        {
          type: "task",
          data: {
            title: "Implementar formulário de captura de leads",
            project_ref: "proj_lancamento",
            milestone_ref: "ms_landing",
            priority: "medium",
          },
        },
        {
          type: "task",
          data: {
            title: "Configurar tracking de conversão",
            project_ref: "proj_lancamento",
            milestone_ref: "ms_campanha",
            priority: "medium",
          },
        },
      ],
    },
  },
  {
    id: "full_okr_and_project",
    label: "OKR + Projeto vinculado",
    description: "Cria um objetivo OKR e um projeto relacionado (referências cruzadas)",
    payload: {
      version: "1.0",
      mode: "create",
      objects: [
        {
          type: "okr_cycle",
          client_ref: "ciclo_s1",
          data: {
            title: "Semestre 1 — 2025",
            start_date: "2025-01-01",
            end_date: "2025-06-30",
            status: "active",
          },
        },
        {
          type: "okr_objective",
          client_ref: "obj_produto",
          data: {
            title: "Lançar nova linha de produtos até junho",
            cycle_ref: "ciclo_s1",
            priority: "critical",
            status: "draft",
          },
        },
        {
          type: "okr_key_result",
          data: {
            title: "Publicar ao menos 3 lançamentos no catálogo",
            objective_ref: "obj_produto",
            cycle_ref: "ciclo_s1",
            metric_type: "number",
            unit: "lançamentos",
            start_value: 0,
            target_value: 3,
            status: "draft",
          },
        },
        {
          type: "project",
          client_ref: "proj_colecao",
          data: {
            title: "Coleção Inverno 2025",
            summary: "Desenvolvimento e lançamento da coleção inverno",
            status: "planned",
            priority: "high",
            cycle_ref: "ciclo_s1",
            estimation_unit: "story_points",
          },
        },
        {
          type: "milestone",
          client_ref: "ms_catalogo_okr",
          data: {
            title: "Catálogo publicado no site",
            project_ref: "proj_colecao",
            due_date: "2025-06-01",
            status: "pending",
          },
        },
        {
          type: "task",
          data: {
            title: "Revisão final do catálogo",
            project_ref: "proj_colecao",
            milestone_ref: "ms_catalogo_okr",
            priority: "medium",
            estimated_points: 5,
          },
        },
      ],
    },
  },
];
