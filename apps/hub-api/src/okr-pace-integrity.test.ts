import { describe, expect, it } from "vitest";
import {
  effectiveHealthSnapshotForOkrPace,
  effectiveOkrStatusForPaceAndWorkflow,
  resolveOkrStatusAfterProgress,
} from "./okr-pace-integrity";

describe("okr-pace-integrity", () => {
  describe("resolveOkrStatusAfterProgress", () => {
    it("p>=100 força completed", () => {
      expect(resolveOkrStatusAfterProgress("at_risk", "on_track", 100)).toBe("completed");
      expect(resolveOkrStatusAfterProgress(undefined, "on_track", 100.5)).toBe("completed");
    });
    it("p<100: completed no input ou no prev reabre para on_track (default)", () => {
      expect(resolveOkrStatusAfterProgress(undefined, "completed", 50)).toBe("on_track");
      expect(resolveOkrStatusAfterProgress("completed", "on_track", 96)).toBe("on_track");
    });
    it("p<100: utilizador pode escolher outro nao-completed se explicito", () => {
      expect(resolveOkrStatusAfterProgress("at_risk", "completed", 50)).toBe("at_risk");
    });
  });

  describe("effectiveOkrStatusForPaceAndWorkflow (leitura, dados sujos)", () => {
    it("ignora completed na BD com p<100", () => {
      expect(effectiveOkrStatusForPaceAndWorkflow("completed", 40)).toBe("on_track");
    });
  });

  describe("effectiveHealthSnapshotForOkrPace (leitura)", () => {
    it("só aplica snapshot com completed+100%", () => {
      expect(effectiveHealthSnapshotForOkrPace("completed", 99, '{"x":1}')).toBeNull();
      expect(effectiveHealthSnapshotForOkrPace("on_track", 100, '{"x":1}')).toBeNull();
      expect(effectiveHealthSnapshotForOkrPace("completed", 100, '{"x":1}')).toBe('{"x":1}');
    });
  });
});
