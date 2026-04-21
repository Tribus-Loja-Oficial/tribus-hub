-- Drop legacy project-scoped objectives and key results tables.
-- These were superseded by okr_objectives and okr_key_results (global OKR module).
DROP TABLE IF EXISTS project_key_results;
DROP TABLE IF EXISTS project_objectives;
