-- Corrige estados sujos: "completed" sem progresso 100% nao e meta atingida; nao congelar health.
UPDATE okr_key_results
SET
  status = 'on_track',
  health_snapshot_json = NULL,
  completed_at = NULL
WHERE
  status = 'completed'
  AND progress_percent < 100.0001;

UPDATE okr_objectives
SET
  status = 'on_track',
  health_snapshot_json = NULL,
  completed_at = NULL
WHERE
  status = 'completed'
  AND progress_percent < 100.0001;
