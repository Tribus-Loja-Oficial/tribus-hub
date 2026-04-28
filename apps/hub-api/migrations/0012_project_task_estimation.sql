-- Project-level estimation mode and task estimates (hours/story points).

ALTER TABLE projects
  ADD COLUMN estimation_unit TEXT NOT NULL DEFAULT 'hours'
  CHECK (estimation_unit IN ('hours', 'story_points'));

ALTER TABLE tasks
  ADD COLUMN estimated_hours REAL;

ALTER TABLE tasks
  ADD COLUMN estimated_points REAL;

