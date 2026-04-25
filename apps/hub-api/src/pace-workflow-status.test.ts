import { describe, expect, it } from "vitest";
import {
  computeWorkflowStatus,
  workflowStatusForOkrObjective,
  workflowStatusForOkrKr,
  workflowStatusForProjectRow,
  workflowStatusForMilestoneRow,
} from "./pace-workflow-status";

// ─── computeWorkflowStatus ────────────────────────────────────────────────────

describe("computeWorkflowStatus", () => {
  const base = {
    kind: "project" as const,
    dbStatus: "active",
    windowStart: "2026-01-01",
    windowEnd: "2026-12-31",
    dateSourcePt: "Projeto.",
  };

  it("returns completed when dbStatus is completed", () => {
    const result = computeWorkflowStatus({ ...base, dbStatus: "completed" });
    expect(result.slug).toBe("completed");
    expect(result.locked).toBe(true);
  });

  it("returns planned when isDraft is true", () => {
    const result = computeWorkflowStatus({ ...base, isDraft: true });
    expect(result.slug).toBe("planned");
  });

  it("returns planned for cancelled project", () => {
    const result = computeWorkflowStatus({ ...base, dbStatus: "cancelled" });
    expect(result.slug).toBe("planned");
  });

  it("returns planned for on_hold project", () => {
    const result = computeWorkflowStatus({ ...base, dbStatus: "on_hold" });
    expect(result.slug).toBe("planned");
  });

  it("returns planned when no window", () => {
    const result = computeWorkflowStatus({ ...base, windowStart: null, windowEnd: null });
    expect(result.slug).toBe("planned");
  });

  it("returns planned when now is before windowStart", () => {
    const result = computeWorkflowStatus({
      ...base,
      windowStart: "2027-01-01",
      windowEnd: "2027-12-31",
      now: new Date("2026-06-01"),
    });
    expect(result.slug).toBe("planned");
  });

  it("returns in_progress when within window", () => {
    const result = computeWorkflowStatus({
      ...base,
      now: new Date("2026-06-01"),
    });
    expect(result.slug).toBe("in_progress");
    expect(result.locked).toBe(false);
  });

  it("returns in_progress when past end but not completed", () => {
    const result = computeWorkflowStatus({
      ...base,
      now: new Date("2027-01-15"),
    });
    expect(result.slug).toBe("in_progress");
    expect(result.explanationPt).toContain("já passou");
  });

  it("returns in_progress for missed milestone", () => {
    const result = computeWorkflowStatus({
      ...base,
      kind: "milestone",
      dbStatus: "missed",
      now: new Date("2026-06-01"),
    });
    expect(result.slug).toBe("in_progress");
  });
});

// ─── workflowStatusForOkrObjective ───────────────────────────────────────────

describe("workflowStatusForOkrObjective", () => {
  it("returns planned for draft objective", () => {
    const result = workflowStatusForOkrObjective(
      { status: "draft", start_date: "2026-01-01", target_date: "2026-12-31" },
      null,
    );
    expect(result.slug).toBe("planned");
  });

  it("returns completed for completed objective", () => {
    const result = workflowStatusForOkrObjective(
      { status: "completed", start_date: "2026-01-01", target_date: "2026-06-30" },
      null,
    );
    expect(result.slug).toBe("completed");
  });
});

// ─── workflowStatusForOkrKr ──────────────────────────────────────────────────

describe("workflowStatusForOkrKr", () => {
  it("returns in_progress for active kr within window", () => {
    const result = workflowStatusForOkrKr(
      { status: "active", start_date: "2026-01-01", target_date: "2026-12-31" },
      { start_date: null, target_date: null },
      null,
    );
    expect(["in_progress", "planned"]).toContain(result.slug);
  });
});

// ─── workflowStatusForProjectRow ─────────────────────────────────────────────

describe("workflowStatusForProjectRow", () => {
  it("returns in_progress for active project with current window", () => {
    const now = new Date();
    const start = new Date(now.getFullYear() - 1, 0, 1).toISOString().slice(0, 10);
    const end = new Date(now.getFullYear() + 1, 11, 31).toISOString().slice(0, 10);
    const result = workflowStatusForProjectRow({
      status: "active",
      start_date: start,
      target_date: end,
    });
    expect(result.slug).toBe("in_progress");
  });

  it("returns planned for project with no dates", () => {
    const result = workflowStatusForProjectRow({
      status: "active",
      start_date: null,
      target_date: null,
    });
    expect(result.slug).toBe("planned");
  });

  it("returns completed for completed project", () => {
    const result = workflowStatusForProjectRow({
      status: "completed",
      start_date: "2026-01-01",
      target_date: "2026-06-30",
    });
    expect(result.slug).toBe("completed");
  });
});

// ─── workflowStatusForMilestoneRow ────────────────────────────────────────────

describe("workflowStatusForMilestoneRow", () => {
  it("returns completed for completed milestone", () => {
    const result = workflowStatusForMilestoneRow(
      { status: "completed", due_date: "2026-06-30" },
      { status: "active", start_date: "2026-01-01", target_date: "2026-12-31", title: "P" },
    );
    expect(result.slug).toBe("completed");
  });

  it("returns in_progress for missed milestone within inherited window", () => {
    const now = new Date();
    const start = new Date(now.getFullYear() - 1, 0, 1).toISOString().slice(0, 10);
    const end = new Date(now.getFullYear() + 1, 11, 31).toISOString().slice(0, 10);
    const result = workflowStatusForMilestoneRow(
      { status: "missed", due_date: null },
      { status: "active", start_date: start, target_date: end, title: "P" },
    );
    expect(result.slug).toBe("in_progress");
  });
});
