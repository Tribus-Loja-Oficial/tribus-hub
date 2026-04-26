import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  reconcileOkrHealthInsightForDisplay,
  isBeforeWindowStartLocalCivil,
} from "./okr-pace-health-local";
import type { HealthInsight } from "@/lib/types/domain";

const baseNotStarted: HealthInsight = {
  slug: "not_started",
  labelPt: "Não Iniciado",
  diff: null,
  elapsedPercent: 0,
  progressPercent: 50,
  band: 8,
  windowStart: "2026-01-10",
  windowEnd: "2026-01-20",
  dateSourcePt: "Teste.",
  locked: false,
  explanationPt: "UTC ainda não começou.",
};

describe("reconcileOkrHealthInsightForDisplay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("mantém not_started se o dia civil local ainda é antes de windowStart", () => {
    vi.setSystemTime(new Date("2026-01-05T12:00:00"));
    const out = reconcileOkrHealthInsightForDisplay(baseNotStarted, { now: new Date() });
    expect(out?.slug).toBe("not_started");
  });

  it("recomputa o slug com janela local (meio do período ~50% tempo = on_track com 50% progresso)", () => {
    vi.setSystemTime(new Date("2026-01-15T12:00:00"));
    const r = reconcileOkrHealthInsightForDisplay(
      { ...baseNotStarted, progressPercent: 50 },
      { now: new Date() },
    );
    expect(r?.slug).toBe("on_track");
    expect(r?.labelPt).toBe("No Rumo");
    expect(r?.elapsedPercent).toBe(50);
  });

  it("prioriza as datas do cadastro em relação à janela herdada da API (ex.: ciclo 20–24 vs KR 21–29)", () => {
    vi.setSystemTime(new Date("2026-04-26T12:00:00"));
    const r = reconcileOkrHealthInsightForDisplay(
      {
        ...baseNotStarted,
        windowStart: "2026-04-20",
        windowEnd: "2026-04-24",
        progressPercent: 96,
      },
      { startDate: "2026-04-21", targetDate: "2026-04-29", now: new Date() },
    );
    expect(r?.windowStart).toBe("2026-04-21");
    expect(r?.windowEnd).toBe("2026-04-29");
    expect(r?.slug).toBe("ahead");
  });
});

describe("isBeforeWindowStartLocalCivil", () => {
  it("hoje 15 >= início 10", () => {
    const now = new Date("2026-01-15T10:00:00");
    expect(isBeforeWindowStartLocalCivil("2026-01-10", now)).toBe(false);
  });
});
