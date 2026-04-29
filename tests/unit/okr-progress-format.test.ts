import { describe, expect, it } from "vitest";
import { formatOkrProgressPercent } from "@/features/okr/lib/okr-progress-format";

describe("formatOkrProgressPercent", () => {
  it("shows one decimal when needed", () => {
    expect(formatOkrProgressPercent(99.5)).toBe("99.5%");
    expect(formatOkrProgressPercent(99.49)).toBe("99.5%");
  });

  it("keeps integer formatting when exact integer", () => {
    expect(formatOkrProgressPercent(100)).toBe("100%");
    expect(formatOkrProgressPercent(87)).toBe("87%");
  });
});
