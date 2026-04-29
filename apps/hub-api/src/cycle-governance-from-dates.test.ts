import { describe, expect, it } from "vitest";
import {
  deriveCycleGovernanceStatusFromDates,
  resolveCycleStatusAfterPatch,
  resolveCycleStatusForCreate,
  utcCivilDateToday,
} from "./cycle-governance-from-dates";

describe("utcCivilDateToday", () => {
  it("formata ano-mês-dia em UTC", () => {
    expect(utcCivilDateToday(new Date("2026-04-28T12:00:00.000Z"))).toBe("2026-04-28");
  });
});

describe("deriveCycleGovernanceStatusFromDates", () => {
  it("janela no passado → closed", () => {
    expect(deriveCycleGovernanceStatusFromDates("2026-01-01", "2026-01-31", "2026-06-01")).toBe(
      "closed",
    );
  });

  it("todo no futuro → planned", () => {
    expect(deriveCycleGovernanceStatusFromDates("2027-01-01", "2027-12-31", "2026-06-01")).toBe(
      "planned",
    );
  });

  it("hoje dentro da janela → active", () => {
    expect(deriveCycleGovernanceStatusFromDates("2026-06-01", "2026-06-30", "2026-06-15")).toBe(
      "active",
    );
  });

  it("dia de início = hoje → active", () => {
    expect(deriveCycleGovernanceStatusFromDates("2026-06-15", "2026-06-30", "2026-06-15")).toBe(
      "active",
    );
  });

  it("dia de fim = hoje → active", () => {
    expect(deriveCycleGovernanceStatusFromDates("2026-06-01", "2026-06-15", "2026-06-15")).toBe(
      "active",
    );
  });

  it("falta data → null", () => {
    expect(deriveCycleGovernanceStatusFromDates(null, "2026-12-31", "2026-06-01")).toBe(null);
    expect(deriveCycleGovernanceStatusFromDates("2026-01-01", undefined, "2026-06-01")).toBe(null);
  });
});

describe("resolveCycleStatusForCreate (contrato POST)", () => {
  it("closed explícito vence derivação", () => {
    expect(resolveCycleStatusForCreate("closed", "active")).toBe("closed");
  });

  it("sem derivação mantém pedido", () => {
    expect(resolveCycleStatusForCreate("planned", null)).toBe("planned");
  });

  it("com derivação e não-closed usa derivado", () => {
    expect(resolveCycleStatusForCreate("planned", "active")).toBe("active");
  });
});

describe("resolveCycleStatusAfterPatch (contrato PATCH / smoke)", () => {
  it("explicito ignora datas", () => {
    expect(
      resolveCycleStatusAfterPatch({
        hasExplicitStatus: true,
        explicitStatus: "planned",
        curStatus: "active",
        mergedStart: "2025-01-01",
        mergedEnd: "2025-12-31",
        todayYmd: "2026-06-15",
      }),
    ).toBe("planned");
  });

  it("closed pegajoso sem status no body", () => {
    expect(
      resolveCycleStatusAfterPatch({
        hasExplicitStatus: false,
        explicitStatus: null,
        curStatus: "closed",
        mergedStart: "2026-01-01",
        mergedEnd: "2028-12-31",
        todayYmd: "2026-06-15",
      }),
    ).toBe("closed");
  });

  it("previsto deriva quando planned e período já passou", () => {
    expect(
      resolveCycleStatusAfterPatch({
        hasExplicitStatus: false,
        explicitStatus: null,
        curStatus: "planned",
        mergedStart: "2025-01-01",
        mergedEnd: "2025-06-30",
        todayYmd: "2026-06-01",
      }),
    ).toBe("closed");
  });
});
