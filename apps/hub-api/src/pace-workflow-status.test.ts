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
    progressPercent: 50,
    windowStart: "2026-01-01",
    windowEnd: "2026-12-31",
    dateSourcePt: "Projeto.",
  };

  it("returns successful when project dbStatus is completed", () => {
    const result = computeWorkflowStatus({ ...base, dbStatus: "completed" });
    expect(result.slug).toBe("successful");
    expect(result.locked).toBe(true);
  });

  it("returns planned when isDraft is true", () => {
    const result = computeWorkflowStatus({ ...base, isDraft: true });
    expect(result.slug).toBe("planned");
  });

  it("returns cancelled for cancelled project", () => {
    const result = computeWorkflowStatus({ ...base, dbStatus: "cancelled" });
    expect(result.slug).toBe("cancelled");
  });

  it("returns blocked for on_hold project", () => {
    const result = computeWorkflowStatus({ ...base, dbStatus: "on_hold" });
    expect(result.slug).toBe("blocked");
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

  it("returns successful when past end and progress is 100%", () => {
    const result = computeWorkflowStatus({
      ...base,
      progressPercent: 100,
      now: new Date("2027-01-15"),
    });
    expect(result.slug).toBe("successful");
  });

  it("returns partially_successful when past end and progress >=80", () => {
    const result = computeWorkflowStatus({
      ...base,
      progressPercent: 85,
      now: new Date("2027-01-15"),
    });
    expect(result.slug).toBe("partially_successful");
  });

  it("returns failed when past end and progress <80", () => {
    const result = computeWorkflowStatus({
      ...base,
      progressPercent: 70,
      now: new Date("2027-01-15"),
    });
    expect(result.slug).toBe("failed");
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

  it("returns completed when cadastro concluiu e progresso 100% (atingido)", () => {
    const result = workflowStatusForOkrObjective(
      {
        status: "completed",
        progress_percent: 100,
        start_date: "2026-01-01",
        target_date: "2026-06-30",
      },
      null,
    );
    expect(result.slug).toBe("completed");
  });

  it("não força concluido de workflow com completed sujo (p<100) — trata como em andamento", () => {
    const result = workflowStatusForOkrObjective(
      {
        status: "completed",
        progress_percent: 40,
        start_date: "2026-01-01",
        target_date: "2026-06-30",
      },
      null,
    );
    expect(result.slug).toBe("in_progress");
  });

  it("após prazo com progresso >=80 retorna achieved", () => {
    const result = workflowStatusForOkrObjective(
      {
        status: "on_track",
        progress_percent: 85,
        start_date: "2024-01-01",
        target_date: "2024-06-30",
      },
      null,
    );
    expect(result.slug).toBe("achieved");
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

  it("após prazo com progresso <80 retorna not_achieved", () => {
    const result = workflowStatusForOkrKr(
      {
        status: "on_track",
        progress_percent: 60,
        start_date: "2024-01-01",
        target_date: "2024-06-30",
      },
      { start_date: null, target_date: null },
      null,
    );
    expect(result.slug).toBe("not_achieved");
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

  it("returns blocked for on_hold project", () => {
    const result = workflowStatusForProjectRow({
      status: "on_hold",
      start_date: "2026-01-01",
      target_date: "2026-06-30",
    });
    expect(result.slug).toBe("blocked");
  });

  it("returns successful for ended project with 100%", () => {
    const result = workflowStatusForProjectRow({
      status: "active",
      progress_percent: 100,
      start_date: "2020-01-01",
      target_date: "2020-06-30",
    });
    expect(result.slug).toBe("successful");
  });

  it("prefers effective progress when provided", () => {
    const result = workflowStatusForProjectRow({
      status: "active",
      progress_percent: 10,
      progress_percent_effective: 100,
      start_date: "2020-01-01",
      target_date: "2020-06-30",
    });
    expect(result.slug).toBe("successful");
  });
});

// ─── workflowStatusForMilestoneRow ────────────────────────────────────────────

describe("workflowStatusForMilestoneRow", () => {
  it("returns successful for completed milestone", () => {
    const result = workflowStatusForMilestoneRow(
      { status: "completed", due_date: "2026-06-30" },
      { status: "active", start_date: "2026-01-01", target_date: "2026-12-31", title: "P" },
    );
    expect(result.slug).toBe("successful");
  });

  it("returns blocked for missed milestone", () => {
    const result = workflowStatusForMilestoneRow(
      { status: "missed", due_date: null },
      { status: "active", start_date: "2026-01-01", target_date: "2026-12-31", title: "P" },
      40,
    );
    expect(result.slug).toBe("blocked");
  });
});
