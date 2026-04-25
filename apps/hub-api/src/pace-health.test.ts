import { describe, expect, it } from "vitest";
import {
  calcElapsedPercent,
  computePaceHealth,
  insightFromSnapshotJson,
  serializeHealthSnapshot,
  resolveOkrObjectiveWindow,
  resolveOkrKrWindow,
  resolveProjectWindow,
  resolveMilestoneWindow,
  buildCompletionSnapshotFromPreCompleteRow,
} from "./pace-health";

// ─── calcElapsedPercent ───────────────────────────────────────────────────────

describe("calcElapsedPercent", () => {
  it("returns 0 when now is before start", () => {
    const now = new Date("2026-01-01");
    expect(calcElapsedPercent("2026-02-01", "2026-03-01", now)).toBe(0);
  });

  it("returns 100 when now is after end", () => {
    const now = new Date("2026-04-01");
    expect(calcElapsedPercent("2026-01-01", "2026-03-01", now)).toBe(100);
  });

  it("returns 50 at the midpoint", () => {
    const now = new Date("2026-02-01");
    expect(calcElapsedPercent("2026-01-01", "2026-03-03", now)).toBe(50);
  });

  it("returns 100 when start equals end", () => {
    expect(calcElapsedPercent("2026-01-01", "2026-01-01", new Date("2026-01-01"))).toBe(100);
  });

  it("returns 0 for invalid date strings", () => {
    expect(calcElapsedPercent("invalid", "2026-03-01", new Date("2026-02-01"))).toBe(0);
  });
});

// ─── computePaceHealth ────────────────────────────────────────────────────────

describe("computePaceHealth", () => {
  const base = {
    kind: "okr_objective" as const,
    status: "active",
    progressPercent: 50,
    windowStart: "2026-01-01",
    windowEnd: "2026-12-31",
    dateSourcePt: "Janela do ciclo.",
    completedAt: null,
    healthSnapshotJson: null,
  };

  it("returns no_dates when window is missing", () => {
    const result = computePaceHealth({ ...base, windowStart: null, windowEnd: null });
    expect(result.slug).toBe("no_dates");
  });

  it("returns not_started when now is before windowStart", () => {
    const result = computePaceHealth({
      ...base,
      windowStart: "2027-01-01",
      windowEnd: "2027-12-31",
      now: new Date("2026-06-01"),
    });
    expect(result.slug).toBe("not_started");
  });

  it("returns ahead when progress is well above elapsed", () => {
    const result = computePaceHealth({
      ...base,
      progressPercent: 80,
      now: new Date("2026-01-15"),
    });
    expect(result.slug).toBe("ahead");
  });

  it("returns on_track when progress matches elapsed", () => {
    const result = computePaceHealth({
      ...base,
      progressPercent: 50,
      now: new Date("2026-07-02"),
    });
    expect(result.slug).toBe("on_track");
  });

  it("returns at_risk when slightly behind", () => {
    const result = computePaceHealth({
      ...base,
      progressPercent: 30,
      now: new Date("2026-07-02"),
    });
    expect(result.slug).toBe("at_risk");
  });

  it("returns off_track when far behind", () => {
    const result = computePaceHealth({
      ...base,
      progressPercent: 0,
      now: new Date("2026-07-02"),
    });
    expect(result.slug).toBe("off_track");
  });

  it("returns draft slug when okr status is draft", () => {
    const result = computePaceHealth({ ...base, status: "draft" });
    expect(result.slug).toBe("draft");
  });

  it("returns locked insight from snapshot when completed", () => {
    const insight = computePaceHealth({
      ...base,
      progressPercent: 80,
      now: new Date("2026-06-01"),
    });
    const snapshot = serializeHealthSnapshot(
      { ...insight, locked: undefined as never },
      "2026-06-01T00:00:00.000Z",
    );
    const result = computePaceHealth({
      ...base,
      status: "completed",
      healthSnapshotJson: snapshot,
    });
    expect(result.locked).toBe(true);
    expect(result.slug).toBe(insight.slug);
  });

  it("returns completed_legacy when no snapshot on completed item", () => {
    const result = computePaceHealth({ ...base, status: "completed" });
    expect(result.slug).toBe("completed_legacy");
    expect(result.locked).toBe(true);
  });
});

// ─── insightFromSnapshotJson ──────────────────────────────────────────────────

describe("insightFromSnapshotJson", () => {
  it("returns null for null/empty input", () => {
    expect(insightFromSnapshotJson(null)).toBeNull();
    expect(insightFromSnapshotJson("")).toBeNull();
    expect(insightFromSnapshotJson(undefined)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(insightFromSnapshotJson("not json")).toBeNull();
  });

  it("returns null when v is not 1", () => {
    expect(insightFromSnapshotJson(JSON.stringify({ v: 2, slug: "on_track" }))).toBeNull();
  });

  it("parses a valid snapshot", () => {
    const snap = JSON.stringify({
      v: 1,
      slug: "on_track",
      computedAt: "2026-01-01T00:00:00.000Z",
      progressPercent: 50,
      band: 8,
      diff: 2,
      elapsedPercent: 48,
      windowStart: "2026-01-01",
      windowEnd: "2026-12-31",
      dateSourcePt: "Ciclo.",
      explanationPt: "Texto.",
    });
    const result = insightFromSnapshotJson(snap);
    expect(result).not.toBeNull();
    expect(result!.slug).toBe("on_track");
    expect(result!.locked).toBe(true);
  });
});

// ─── serializeHealthSnapshot ─────────────────────────────────────────────────

describe("serializeHealthSnapshot", () => {
  it("round-trips through insightFromSnapshotJson", () => {
    const insight = computePaceHealth({
      kind: "project",
      status: "active",
      progressPercent: 60,
      windowStart: "2026-01-01",
      windowEnd: "2026-12-31",
      dateSourcePt: "Projeto.",
      completedAt: null,
      healthSnapshotJson: null,
      now: new Date("2026-07-01"),
    });
    const json = serializeHealthSnapshot(insight, "2026-07-01T00:00:00.000Z");
    const parsed = insightFromSnapshotJson(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.slug).toBe(insight.slug);
    expect(parsed!.progressPercent).toBe(insight.progressPercent);
  });
});

// ─── resolveOkrObjectiveWindow ────────────────────────────────────────────────

describe("resolveOkrObjectiveWindow", () => {
  it("uses objective dates when present", () => {
    const result = resolveOkrObjectiveWindow(
      { start_date: "2026-01-01", target_date: "2026-06-30" },
      { start_date: "2026-03-01", end_date: "2026-12-31", title: "Q1" },
    );
    expect(result.start).toBe("2026-01-01");
    expect(result.end).toBe("2026-06-30");
  });

  it("falls back to cycle dates", () => {
    const result = resolveOkrObjectiveWindow(
      { start_date: null, target_date: null },
      { start_date: "2026-01-01", end_date: "2026-12-31", title: "Anual" },
    );
    expect(result.start).toBe("2026-01-01");
    expect(result.end).toBe("2026-12-31");
  });

  it("returns nulls when no dates anywhere", () => {
    const result = resolveOkrObjectiveWindow({ start_date: null, target_date: null }, null);
    expect(result.start).toBeNull();
    expect(result.end).toBeNull();
  });
});

// ─── resolveOkrKrWindow ───────────────────────────────────────────────────────

describe("resolveOkrKrWindow", () => {
  it("prioritizes kr > objective > cycle", () => {
    const result = resolveOkrKrWindow(
      { start_date: "2026-02-01", target_date: "2026-05-31" },
      { start_date: "2026-01-01", target_date: "2026-12-31" },
      { start_date: "2025-01-01", end_date: "2025-12-31", title: "Ciclo" },
    );
    expect(result.start).toBe("2026-02-01");
    expect(result.end).toBe("2026-05-31");
  });

  it("falls through to objective when kr has no dates", () => {
    const result = resolveOkrKrWindow(
      { start_date: null, target_date: null },
      { start_date: "2026-01-01", target_date: "2026-06-30" },
      null,
    );
    expect(result.start).toBe("2026-01-01");
    expect(result.end).toBe("2026-06-30");
  });
});

// ─── resolveProjectWindow ─────────────────────────────────────────────────────

describe("resolveProjectWindow", () => {
  it("uses project start_date and target_date", () => {
    const result = resolveProjectWindow({ start_date: "2026-01-01", target_date: "2026-12-31" });
    expect(result.start).toBe("2026-01-01");
    expect(result.end).toBe("2026-12-31");
  });

  it("returns null for missing dates", () => {
    const result = resolveProjectWindow({ start_date: null, target_date: null });
    expect(result.start).toBeNull();
    expect(result.end).toBeNull();
  });
});

// ─── resolveMilestoneWindow ───────────────────────────────────────────────────

describe("resolveMilestoneWindow", () => {
  it("uses project start and milestone due_date", () => {
    const result = resolveMilestoneWindow(
      { due_date: "2026-06-30" },
      { start_date: "2026-01-01", target_date: "2026-12-31", title: "Projeto X" },
    );
    expect(result.start).toBe("2026-01-01");
    expect(result.end).toBe("2026-06-30");
  });

  it("falls back to project target_date when no due_date", () => {
    const result = resolveMilestoneWindow(
      { due_date: null },
      { start_date: "2026-01-01", target_date: "2026-12-31", title: "Projeto X" },
    );
    expect(result.end).toBe("2026-12-31");
  });
});

// ─── buildCompletionSnapshotFromPreCompleteRow ────────────────────────────────

describe("buildCompletionSnapshotFromPreCompleteRow", () => {
  it("returns null when already has a snapshot", () => {
    const result = buildCompletionSnapshotFromPreCompleteRow({
      kind: "project",
      previousStatus: "active",
      progressPercent: 80,
      windowStart: "2026-01-01",
      windowEnd: "2026-12-31",
      dateSourcePt: "Projeto.",
      existingSnapshot: '{"v":1,"slug":"on_track"}',
      now: new Date("2026-06-01"),
    });
    expect(result).toBeNull();
  });

  it("returns null when previousStatus is already completed", () => {
    const result = buildCompletionSnapshotFromPreCompleteRow({
      kind: "project",
      previousStatus: "completed",
      progressPercent: 100,
      windowStart: "2026-01-01",
      windowEnd: "2026-12-31",
      dateSourcePt: "Projeto.",
      existingSnapshot: null,
      now: new Date("2026-12-31"),
    });
    expect(result).toBeNull();
  });

  it("builds a snapshot JSON from active status", () => {
    const result = buildCompletionSnapshotFromPreCompleteRow({
      kind: "project",
      previousStatus: "active",
      progressPercent: 75,
      windowStart: "2026-01-01",
      windowEnd: "2026-12-31",
      dateSourcePt: "Projeto.",
      existingSnapshot: null,
      now: new Date("2026-07-01"),
    });
    expect(result).not.toBeNull();
    const parsed = insightFromSnapshotJson(result);
    expect(parsed).not.toBeNull();
    expect(parsed!.locked).toBe(true);
  });
});
