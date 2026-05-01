import { describe, expect, it, vi } from "vitest";
import {
  countKrPaceRisk,
  countObjectiveDashboardPaceBuckets,
  countObjectivePaceRisk,
  countOkrCompletedObjectives,
  healthInsightForObjective,
  isOkrPaceRiskSlug,
} from "./okr-health-insights";

describe("okr-health-insights", () => {
  it("isOkrPaceRiskSlug", () => {
    expect(isOkrPaceRiskSlug("at_risk")).toBe(true);
    expect(isOkrPaceRiskSlug("off_track")).toBe(true);
    expect(isOkrPaceRiskSlug("on_track")).toBe(false);
  });

  it("countObjectivePaceRisk usa ritmo, não só status persistido (at_risk na BD mas ritmo no rumo)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));
    const cycle: Record<string, unknown> = {
      id: "c1",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      title: "2026",
    };
    const cycleById = new Map<string, Record<string, unknown>>([["c1", cycle]]);
    const objectives: Record<string, unknown>[] = [
      {
        id: "o1",
        cycle_id: "c1",
        status: "at_risk",
        progress_percent: 28,
        start_date: null,
        target_date: null,
        completed_at: null,
        health_snapshot_json: null,
      },
    ];
    const hi = healthInsightForObjective(objectives[0]!, cycle);
    expect(hi.slug).toBe("on_track");
    const counts = countObjectivePaceRisk(objectives, cycleById);
    expect(counts.objectivesAtRisk).toBe(0);
    expect(counts.objectivesOffTrack).toBe(0);
    vi.useRealTimers();
  });

  it("countObjectivePaceRisk marca off_track quando progresso está muito abaixo do tempo decorrido", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T12:00:00.000Z"));
    const cycle: Record<string, unknown> = {
      id: "c1",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      title: "2026",
    };
    const cycleById = new Map<string, Record<string, unknown>>([["c1", cycle]]);
    const objectives: Record<string, unknown>[] = [
      {
        id: "o1",
        cycle_id: "c1",
        status: "on_track",
        progress_percent: 5,
        start_date: null,
        target_date: null,
        completed_at: null,
        health_snapshot_json: null,
      },
    ];
    const counts = countObjectivePaceRisk(objectives, cycleById);
    expect(counts.objectivesOffTrack).toBe(1);
    expect(counts.objectivesAtRisk).toBe(0);
    vi.useRealTimers();
  });

  it("countKrPaceRisk usa objetivo pai e ciclo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T12:00:00.000Z"));
    const cycle: Record<string, unknown> = {
      id: "c1",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      title: "2026",
    };
    const cycleById = new Map<string, Record<string, unknown>>([["c1", cycle]]);
    const objective: Record<string, unknown> = {
      id: "o1",
      cycle_id: "c1",
      status: "on_track",
      progress_percent: 40,
      start_date: null,
      target_date: null,
      completed_at: null,
      health_snapshot_json: null,
    };
    const objectiveById = new Map<string, Record<string, unknown>>([["o1", objective]]);
    const krs: Record<string, unknown>[] = [
      {
        id: "k1",
        objective_id: "o1",
        cycle_id: "c1",
        status: "on_track",
        progress_percent: 2,
        start_date: null,
        target_date: null,
        completed_at: null,
        health_snapshot_json: null,
      },
    ];
    const counts = countKrPaceRisk(krs, objectiveById, cycleById);
    expect(counts.krsOffTrack + counts.krsAtRisk).toBeGreaterThanOrEqual(1);
    vi.useRealTimers();
  });

  it("countObjectiveDashboardPaceBuckets: BD on_track antes do início da janela conta como planejado (not_started)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
    const cycle: Record<string, unknown> = {
      id: "c1",
      start_date: "2026-02-01",
      end_date: "2026-12-31",
      title: "2026",
    };
    const cycleById = new Map<string, Record<string, unknown>>([["c1", cycle]]);
    const objectives: Record<string, unknown>[] = [
      {
        id: "o1",
        cycle_id: "c1",
        status: "on_track",
        progress_percent: 0,
        start_date: null,
        target_date: null,
        completed_at: null,
        health_snapshot_json: null,
      },
    ];
    const hi = healthInsightForObjective(objectives[0]!, cycle);
    expect(hi.slug).toBe("not_started");
    const b = countObjectiveDashboardPaceBuckets(objectives, cycleById);
    expect(b.onTrack).toBe(0);
    expect(b.planejado).toBe(1);
    expect(b.atRisk).toBe(0);
    expect(b.offTrack).toBe(0);
    vi.useRealTimers();
  });

  it("countObjectiveDashboardPaceBuckets exclui concluídos do ritmo; countOkrCompletedObjectives conta meta", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
    const cycle: Record<string, unknown> = {
      id: "c1",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      title: "2026",
    };
    const cycleById = new Map<string, Record<string, unknown>>([["c1", cycle]]);
    const objectives: Record<string, unknown>[] = [
      {
        id: "o1",
        cycle_id: "c1",
        status: "completed",
        progress_percent: 100,
        start_date: null,
        target_date: null,
        completed_at: "2026-06-01T00:00:00.000Z",
        health_snapshot_json: null,
      },
      {
        id: "o2",
        cycle_id: "c1",
        status: "on_track",
        progress_percent: 50,
        start_date: null,
        target_date: null,
        completed_at: null,
        health_snapshot_json: null,
      },
    ];
    const b = countObjectiveDashboardPaceBuckets(objectives, cycleById);
    expect(countOkrCompletedObjectives(objectives)).toBe(1);
    expect(b.onTrack + b.planejado + b.atRisk + b.offTrack).toBe(1);
    vi.useRealTimers();
  });
});
