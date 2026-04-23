import type { IngestionObjectType } from "@/lib/schemas/ingestion.schemas";

/** Obrigatório no objeto | em `data` | condicional (ver `condition`). */
export type FieldRequirement = "required" | "optional" | "conditional";

export type IngestionFieldRow = {
  /** Chave em `data` (snake_case, igual ao JSON de ingestão). */
  key: string;
  requirement: FieldRequirement;
  /** Quando `requirement === "conditional"`. */
  condition?: string;
  /** Tipo lógico para quem monta o JSON. */
  valueType: string;
  enumValues?: readonly string[];
  default?: string;
  maxLength?: number;
  hint?: string;
};

export type IngestionTypeReference = {
  type: IngestionObjectType;
  /** Uma linha sobre o que este tipo representa. */
  summary: string;
  /** Campos no envelope de cada item: `type`, `client_ref`, `data`. */
  envelope: Array<{
    key: string;
    requirement: FieldRequirement;
    hint?: string;
  }>;
  dataFields: IngestionFieldRow[];
};

const envCommon: IngestionTypeReference["envelope"] = [
  { key: "type", requirement: "required", hint: "literal do tipo (ex.: okr_cycle)" },
  { key: "client_ref", requirement: "optional", hint: "único no payload; use *_ref nos filhos" },
  { key: "data", requirement: "required", hint: "objeto com os campos abaixo" },
];

export const INGESTION_TYPE_REFERENCES: IngestionTypeReference[] = [
  {
    type: "okr_cycle",
    summary: "Período de planejamento/revisão de OKRs.",
    envelope: envCommon,
    dataFields: [
      { key: "title", requirement: "required", valueType: "string", maxLength: 200 },
      {
        key: "external_ref",
        requirement: "optional",
        valueType: "string",
        maxLength: 100,
        hint: "Ref. humana do novo ciclo (ex.: CYC-0003); registada no workspace",
      },
      { key: "start_date", requirement: "required", valueType: "string (YYYY-MM-DD)" },
      { key: "end_date", requirement: "required", valueType: "string (YYYY-MM-DD)" },
      { key: "description", requirement: "optional", valueType: "string", maxLength: 2000 },
      {
        key: "status",
        requirement: "optional",
        valueType: "enum",
        enumValues: ["planned", "active", "closed", "archived"],
        default: "planned",
      },
    ],
  },
  {
    type: "okr_objective",
    summary: "Objetivo dentro de um ciclo OKR.",
    envelope: envCommon,
    dataFields: [
      { key: "title", requirement: "required", valueType: "string", maxLength: 500 },
      { key: "description", requirement: "optional", valueType: "string", maxLength: 5000 },
      {
        key: "cycle_id",
        requirement: "optional",
        valueType: "string",
        hint: "ID real de ciclo existente no workspace",
      },
      {
        key: "cycle_ref",
        requirement: "optional",
        valueType: "string",
        hint: "client_ref de um okr_cycle no mesmo payload",
      },
      {
        key: "cycle_external_ref",
        requirement: "optional",
        valueType: "string",
        maxLength: 100,
        hint: "external_ref de um ciclo já existente no workspace",
      },
      {
        key: "external_ref",
        requirement: "optional",
        valueType: "string",
        maxLength: 100,
        hint: "Ref. humana do novo objetivo (ex.: OBJ-0004)",
      },
      {
        key: "owner_user_id",
        requirement: "optional",
        valueType: "string",
        hint: "ID de utilizador (não email)",
      },
      {
        key: "owner_user_external_ref",
        requirement: "optional",
        valueType: "string",
        maxLength: 100,
        hint: "Resolução por external_ref de utilizador já existente",
      },
      {
        key: "status",
        requirement: "optional",
        valueType: "enum",
        enumValues: ["draft", "on_track", "at_risk", "off_track", "completed"],
        default: "draft",
      },
      {
        key: "priority",
        requirement: "optional",
        valueType: "enum",
        enumValues: ["low", "medium", "high", "critical"],
      },
      { key: "start_date", requirement: "optional", valueType: "string (YYYY-MM-DD)" },
      { key: "target_date", requirement: "optional", valueType: "string (YYYY-MM-DD)" },
    ],
  },
  {
    type: "okr_key_result",
    summary: "Métrica mensurável ligada a um objetivo.",
    envelope: envCommon,
    dataFields: [
      { key: "title", requirement: "required", valueType: "string", maxLength: 500 },
      {
        key: "objective_id",
        requirement: "conditional",
        condition: "Obrigatório se não houver objective_ref nem objective_external_ref",
        valueType: "string",
        hint: "ID real do objetivo",
      },
      {
        key: "objective_ref",
        requirement: "conditional",
        condition: "Obrigatório se não houver objective_id nem objective_external_ref",
        valueType: "string",
        hint: "client_ref de um okr_objective no mesmo payload",
      },
      {
        key: "objective_external_ref",
        requirement: "conditional",
        condition: "Obrigatório se não houver objective_id nem objective_ref",
        valueType: "string",
        maxLength: 100,
        hint: "external_ref de um objetivo já existente no workspace",
      },
      {
        key: "external_ref",
        requirement: "optional",
        valueType: "string",
        maxLength: 100,
        hint: "Ref. humana do novo KR (ex.: KR-0008)",
      },
      { key: "description", requirement: "optional", valueType: "string", maxLength: 5000 },
      { key: "cycle_id", requirement: "optional", valueType: "string" },
      {
        key: "cycle_ref",
        requirement: "optional",
        valueType: "string",
        hint: "client_ref de okr_cycle",
      },
      {
        key: "cycle_external_ref",
        requirement: "optional",
        valueType: "string",
        maxLength: 100,
        hint: "external_ref de um ciclo já existente",
      },
      { key: "owner_user_id", requirement: "optional", valueType: "string" },
      {
        key: "owner_user_external_ref",
        requirement: "optional",
        valueType: "string",
        maxLength: 100,
        hint: "external_ref de utilizador já existente",
      },
      {
        key: "metric_type",
        requirement: "optional",
        valueType: "enum",
        enumValues: ["percentage", "number", "currency", "boolean", "custom"],
        default: "number",
      },
      { key: "unit", requirement: "optional", valueType: "string", maxLength: 50 },
      { key: "start_value", requirement: "optional", valueType: "number", default: "0" },
      {
        key: "current_value",
        requirement: "optional",
        valueType: "number",
        hint: "Se omitido, usa start_value",
      },
      { key: "target_value", requirement: "required", valueType: "number" },
      {
        key: "status",
        requirement: "optional",
        valueType: "enum",
        enumValues: ["draft", "on_track", "at_risk", "off_track", "completed"],
        default: "draft",
      },
      {
        key: "confidence",
        requirement: "optional",
        valueType: "integer",
        hint: "0–100",
      },
      { key: "start_date", requirement: "optional", valueType: "string (YYYY-MM-DD)" },
      { key: "target_date", requirement: "optional", valueType: "string (YYYY-MM-DD)" },
    ],
  },
  {
    type: "project",
    summary: "Projeto no workspace.",
    envelope: envCommon,
    dataFields: [
      { key: "title", requirement: "required", valueType: "string", maxLength: 500 },
      {
        key: "external_ref",
        requirement: "optional",
        valueType: "string",
        maxLength: 100,
        hint: "Ref. humana do novo projeto (ex.: PRJ-0007)",
      },
      { key: "summary", requirement: "optional", valueType: "string", maxLength: 1000 },
      {
        key: "status",
        requirement: "optional",
        valueType: "enum",
        enumValues: ["planned", "active", "on_hold", "completed", "cancelled"],
        default: "planned",
      },
      {
        key: "health_status",
        requirement: "optional",
        valueType: "enum",
        enumValues: ["on_track", "at_risk", "blocked", "off_track"],
      },
      {
        key: "priority",
        requirement: "optional",
        valueType: "enum",
        enumValues: ["low", "medium", "high", "urgent"],
      },
      { key: "owner_user_id", requirement: "optional", valueType: "string" },
      {
        key: "owner_user_external_ref",
        requirement: "optional",
        valueType: "string",
        maxLength: 100,
        hint: "external_ref de utilizador já existente",
      },
      { key: "start_date", requirement: "optional", valueType: "string (YYYY-MM-DD)" },
      { key: "target_date", requirement: "optional", valueType: "string (YYYY-MM-DD)" },
    ],
  },
  {
    type: "milestone",
    summary: "Marco dentro de um projeto.",
    envelope: envCommon,
    dataFields: [
      { key: "title", requirement: "required", valueType: "string", maxLength: 500 },
      {
        key: "external_ref",
        requirement: "optional",
        valueType: "string",
        maxLength: 100,
        hint: "Ref. humana do novo milestone (ex.: MS-0002)",
      },
      {
        key: "project_id",
        requirement: "conditional",
        condition: "Obrigatório se não houver project_ref nem project_external_ref",
        valueType: "string",
      },
      {
        key: "project_ref",
        requirement: "conditional",
        condition: "Obrigatório se não houver project_id nem project_external_ref",
        valueType: "string",
        hint: "client_ref de project",
      },
      {
        key: "project_external_ref",
        requirement: "conditional",
        condition: "Obrigatório se não houver project_id nem project_ref",
        valueType: "string",
        maxLength: 100,
        hint: "external_ref de um projeto já existente",
      },
      { key: "description", requirement: "optional", valueType: "string", maxLength: 2000 },
      {
        key: "status",
        requirement: "optional",
        valueType: "enum",
        enumValues: ["pending", "in_progress", "completed", "missed"],
        default: "pending",
      },
      {
        key: "priority",
        requirement: "optional",
        valueType: "enum",
        enumValues: ["low", "medium", "high", "urgent"],
        hint: "Se omitido, API usa medium",
      },
      { key: "owner_user_id", requirement: "optional", valueType: "string" },
      {
        key: "owner_user_external_ref",
        requirement: "optional",
        valueType: "string",
        maxLength: 100,
        hint: "external_ref de utilizador já existente",
      },
      { key: "due_date", requirement: "optional", valueType: "string (YYYY-MM-DD)" },
    ],
  },
  {
    type: "task",
    summary: "Tarefa no board (coluna resolvida por id, nome ou padrão).",
    envelope: envCommon,
    dataFields: [
      { key: "title", requirement: "required", valueType: "string", maxLength: 500 },
      {
        key: "external_ref",
        requirement: "optional",
        valueType: "string",
        maxLength: 100,
        hint: "Ref. humana da nova tarefa (ex.: TSK-0009)",
      },
      { key: "description", requirement: "optional", valueType: "string", maxLength: 5000 },
      { key: "project_id", requirement: "optional", valueType: "string" },
      {
        key: "project_ref",
        requirement: "optional",
        valueType: "string",
        hint: "client_ref de project",
      },
      {
        key: "project_external_ref",
        requirement: "optional",
        valueType: "string",
        maxLength: 100,
        hint: "external_ref de projeto já existente",
      },
      { key: "milestone_id", requirement: "optional", valueType: "string" },
      {
        key: "milestone_ref",
        requirement: "optional",
        valueType: "string",
        hint: "client_ref de milestone",
      },
      {
        key: "milestone_external_ref",
        requirement: "optional",
        valueType: "string",
        maxLength: 100,
        hint: "external_ref de milestone já existente",
      },
      { key: "column_id", requirement: "optional", valueType: "string" },
      {
        key: "column_name",
        requirement: "optional",
        valueType: "string",
        hint: "Nome ou slug da coluna (case-insensitive)",
      },
      {
        key: "priority",
        requirement: "optional",
        valueType: "enum",
        enumValues: ["low", "medium", "high", "urgent"],
      },
      { key: "assignee_user_id", requirement: "optional", valueType: "string" },
      {
        key: "assignee_user_external_ref",
        requirement: "optional",
        valueType: "string",
        maxLength: 100,
        hint: "external_ref de utilizador já existente",
      },
      { key: "due_date", requirement: "optional", valueType: "string (YYYY-MM-DD)" },
      {
        key: "label_ids",
        requirement: "optional",
        valueType: "string[]",
        hint: "IDs de labels já existentes no workspace",
      },
    ],
  },
];

export const INGESTION_ENVELOPE_META = {
  version: {
    requirement: "required" as const,
    value: '"1.0"',
    hint: "Literal fixo",
  },
  mode: {
    requirement: "required" as const,
    value: '"create"',
    hint: "Literal fixo",
  },
  objects: {
    requirement: "required" as const,
    valueType: "array",
    hint: "1 a 200 itens; ordem no servidor: ciclo → objetivo → KR → projeto → milestone → task",
  },
};
