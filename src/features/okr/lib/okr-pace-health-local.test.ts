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
    const out = reconcileOkrHealthInsightForDisplay(baseNotStarted, new Date());
    expect(out?.slug).toBe("not_started");
  });

  it("recomputa o slug se not_started da API mas o dia local já entrou na janela (caso fuso/UTC vs local)", () => {
    // Meio do período: ~50% de tempo e 50% progresso → on_track
    vi.setSystemTime(new Date("2026-01-15T12:00:00"));
    const r = reconcileOkrHealthInsightForDisplay(
      { ...baseNotStarted, progressPercent: 50 },
      new Date(),
    );
    expect(r?.slug).toBe("on_track");
    expect(r?.labelPt).toBe("No Rumo");
    expect(r?.elapsedPercent).toBe(50);
  });
});

describe("isBeforeWindowStartLocalCivil", () => {
  it("hoje 15 >= início 10", () => {
    const now = new Date("2026-01-15T10:00:00");
    expect(isBeforeWindowStartLocalCivil("2026-01-10", now)).toBe(false);
  });
});
