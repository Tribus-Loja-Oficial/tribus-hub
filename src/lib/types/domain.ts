// Plain TypeScript domain types — no Drizzle dependency.

// ─── Users ────────────────────────────────────────────────────────────────────

export type UserRole = "owner" | "admin" | "member";
// Data comes from hub-api (Cloudflare Worker + D1) via hubApiFetch.

// ─── Audit ───────────────────────────────────────────────────────────────────

export type AuditAction =
  | "page.created"
  | "page.updated"
  | "page.archived"
  | "page.restored"
  | "page.deleted"
  | "project.created"
  | "project.updated"
  | "project.archived"
  | "project.deleted"
  | "task.created"
  | "task.updated"
  | "task.moved"
  | "task.deleted"
  | "asset.uploaded"
  | "asset.deleted"
  | "user.created"
  | "user.login"
  | "ingestion.validated"
  | "ingestion.executed";

// ─── OKR ─────────────────────────────────────────────────────────────────────

export type OkrCycleStatus = "planned" | "active" | "closed";
export type OkrObjectiveStatus = "draft" | "on_track" | "at_risk" | "off_track" | "completed";
export type OkrKeyResultStatus = "draft" | "on_track" | "at_risk" | "off_track" | "completed";
export type OkrMetricType = "percentage" | "number" | "currency" | "boolean" | "custom";
export type OkrPriority = "low" | "medium" | "high" | "critical";

/** Pace-based health from hub-api (`computePaceHealth`). */
export type PaceHealthSlug =
  | "draft"
  | "no_dates"
  | "not_started"
  | "ahead"
  | "on_track"
  | "at_risk"
  | "off_track"
  | "completed_legacy";

export interface HealthInsight {
  slug: PaceHealthSlug;
  labelPt: string;
  diff: number | null;
  elapsedPercent: number | null;
  progressPercent: number;
  band: number;
  windowStart: string | null;
  windowEnd: string | null;
  dateSourcePt: string;
  locked: boolean;
  explanationPt: string;
}

/** Status operacional unificado (calendário + cadastro), vindo do hub-api. */
export type WorkflowStatusSlug =
  | "planned"
  | "in_progress"
  | "blocked"
  | "completed"
  | "achieved"
  | "not_achieved"
  | "successful"
  | "partially_successful"
  | "failed"
  | "cancelled";

export interface WorkflowStatusInsight {
  slug: WorkflowStatusSlug;
  labelPt: string;
  dateSourcePt: string;
  windowStart: string | null;
  windowEnd: string | null;
  locked: boolean;
  explanationPt: string;
}

export interface OkrCycle {
  id: string;
  externalRef?: string | null;
  workspaceId: string;
  title: string;
  slug: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: OkrCycleStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface OkrObjective {
  id: string;
  externalRef?: string | null;
  workspaceId: string;
  cycleId: string | null;
  title: string;
  slug: string;
  descriptionJson: unknown | null;
  descriptionText: string | null;
  ownerUserId: string | null;
  status: OkrObjectiveStatus;
  progressPercent: number;
  priority: OkrPriority;
  sortOrder: number;
  startDate: string | null;
  targetDate: string | null;
  completedAt: string | null;
  healthSnapshotJson?: string | null;
  healthInsight?: HealthInsight;
  workflowStatusInsight?: WorkflowStatusInsight;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface OkrKeyResult {
  id: string;
  externalRef?: string | null;
  workspaceId: string;
  cycleId: string | null;
  objectiveId: string;
  title: string;
  slug: string;
  descriptionJson: unknown | null;
  descriptionText: string | null;
  ownerUserId: string | null;
  metricType: OkrMetricType;
  unit: string | null;
  startValue: number;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  status: OkrKeyResultStatus;
  sortOrder: number;
  startDate: string | null;
  targetDate: string | null;
  completedAt: string | null;
  healthSnapshotJson?: string | null;
  healthInsight?: HealthInsight;
  workflowStatusInsight?: WorkflowStatusInsight;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface OkrKeyResultUpdate {
  id: string;
  keyResultId: string;
  previousValue: number;
  newValue: number;
  comment: string | null;
  updatedBy: string;
  createdAt: string;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export type ProjectStatus = "planned" | "active" | "on_hold" | "completed" | "cancelled";
export type ProjectPriority = "low" | "medium" | "high" | "urgent";
export type ProjectHealthStatus = "on_track" | "at_risk" | "blocked" | "off_track";

export interface Project {
  id: string;
  externalRef?: string | null;
  workspaceId: string;
  title: string;
  slug: string;
  summary: string | null;
  descriptionJson: unknown | null;
  descriptionText: string | null;
  status: ProjectStatus;
  healthStatus: ProjectHealthStatus | null;
  priority: ProjectPriority;
  progressPercent: number;
  ownerUserId: string | null;
  cycleId?: string | null;
  startDate: string | null;
  targetDate: string | null;
  completedAt: string | null;
  estimationUnit?: "hours" | "story_points";
  healthSnapshotJson?: string | null;
  healthInsight?: HealthInsight;
  workflowStatusInsight?: WorkflowStatusInsight;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export type MilestoneStatus = "pending" | "in_progress" | "completed" | "missed" | "blocked";

export interface Milestone {
  id: string;
  externalRef?: string | null;
  projectId: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  priority: ProjectPriority;
  dueDate: string | null;
  completedAt: string | null;
  healthSnapshotJson?: string | null;
  /** % of tasks under this milestone that are done (hub-api). */
  taskProgressPercent?: number;
  healthInsight?: HealthInsight;
  workflowStatusInsight?: WorkflowStatusInsight;
  ownerUserId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  externalRef?: string | null;
  workspaceId: string;
  projectId: string | null;
  milestoneId: string | null;
  columnId: string;
  title: string;
  slug: string;
  descriptionJson: unknown | null;
  descriptionText: string | null;
  priority: TaskPriority;
  assigneeUserId: string | null;
  reporterUserId: string | null;
  dueDate: string | null;
  startDate: string | null;
  completedAt: string | null;
  estimatedHours?: number | null;
  estimatedPoints?: number | null;
  sortOrder: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface TaskColumn {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  colorToken: string | null;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export type PageStatus = "draft" | "published" | "archived";

export interface Page {
  id: string;
  workspaceId: string;
  parentPageId: string | null;
  isFolder: boolean;
  sortOrder: number;
  title: string;
  slug: string;
  icon: string | null;
  coverImageAssetId: string | null;
  excerpt: string | null;
  contentJson: unknown | null;
  contentText: string | null;
  status: PageStatus;
  isDeleted: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface PageRevision {
  id: string;
  pageId: string;
  version: number;
  title: string;
  contentJson: unknown | null;
  contentText: string | null;
  createdBy: string;
  changeReason: string | null;
  createdAt: string;
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export type AssetUsageKind = "cover" | "inline" | "attachment" | "reference" | "avatar";

export interface Asset {
  id: string;
  workspaceId: string;
  storageProvider: "r2";
  bucket: string;
  objectKey: string;
  originalFilename: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  checksumSha256: string | null;
  width: number | null;
  height: number | null;
  uploadedBy: string;
  createdAt: string;
}

export interface AssetLink {
  id: string;
  assetId: string;
  entityType: string;
  entityId: string;
  usageKind: AssetUsageKind;
  createdAt: string;
}
