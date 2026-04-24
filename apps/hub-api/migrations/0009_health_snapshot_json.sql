-- Frozen pace-health snapshot when an entity is marked completed (OKR / project / milestone).

ALTER TABLE okr_objectives ADD COLUMN health_snapshot_json TEXT;
ALTER TABLE okr_key_results ADD COLUMN health_snapshot_json TEXT;
ALTER TABLE projects ADD COLUMN health_snapshot_json TEXT;
ALTER TABLE milestones ADD COLUMN health_snapshot_json TEXT;
