import { describe, expect, it } from "vitest";
import {
  PACE_CIVIL_TIMEZONE_DEFAULT,
  calcElapsedPercentCivilInTimeZone,
  civilYmdForInstantInTimeZone,
  isCivilCalendarBeforePrazoStart,
} from "./pace-civil-dates";

describe("pace-civil-dates", () => {
  it("meia-noite UTC pode ser o dia anterior no Brasil; isBefore leva fuso", () => {
    // 6 Jan 00:00 UTC = 5 Jan a noite em SP; inicio 6 Jan 2026 → ainda nao
    const midnightUtcJan6 = new Date("2026-01-06T00:00:00.000Z");
    expect(civilYmdForInstantInTimeZone(midnightUtcJan6, PACE_CIVIL_TIMEZONE_DEFAULT)).toBe(
      "2026-01-05",
    );
    expect(
      isCivilCalendarBeforePrazoStart("2026-01-06", midnightUtcJan6, PACE_CIVIL_TIMEZONE_DEFAULT),
    ).toBe(true);
  });

  it("calcElapsedPercentCivil: meio de janela em calendario SP", () => {
    const t = new Date("2026-01-06T15:00:00.000Z");
    expect(
      calcElapsedPercentCivilInTimeZone("2026-01-01", "2026-01-11", t, PACE_CIVIL_TIMEZONE_DEFAULT),
    ).toBe(50);
  });
});
