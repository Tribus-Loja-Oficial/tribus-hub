import { describe, expect, it } from "vitest";
import {
  createCycleSchema,
  createKeyResultSchema,
  createKeyResultUpdateSchema,
  createObjectiveSchema,
} from "@/lib/schemas/okr.schemas";

describe("createCycleSchema", () => {
  const base = { title: "Q1 2025", startDate: "2025-01-01", endDate: "2025-03-31" };

  it("accepts minimal valid input", () => {
    expect(createCycleSchema.safeParse(base).success).toBe(true);
  });

  it("accepts with all optional fields", () => {
    const result = createCycleSchema.safeParse({
      ...base,
      description: "First quarter objectives",
      status: "active",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    expect(createCycleSchema.safeParse({ ...base, title: "" }).success).toBe(false);
  });

  it("rejects title over 200 chars", () => {
    expect(createCycleSchema.safeParse({ ...base, title: "a".repeat(201) }).success).toBe(false);
  });

  it("rejects invalid status", () => {
    expect(createCycleSchema.safeParse({ ...base, status: "done" }).success).toBe(false);
  });

  it("rejects invalid date format", () => {
    expect(createCycleSchema.safeParse({ ...base, startDate: "01-01-2025" }).success).toBe(false);
  });

  it("accepts all valid statuses", () => {
    for (const status of ["planned", "active", "closed"]) {
      expect(createCycleSchema.safeParse({ ...base, status }).success).toBe(true);
    }
  });

  it("rejects archived status", () => {
    expect(createCycleSchema.safeParse({ ...base, status: "archived" as never }).success).toBe(
      false,
    );
  });
});

describe("createObjectiveSchema", () => {
  const base = { title: "Grow revenue by 20%" };

  it("accepts minimal valid input", () => {
    expect(createObjectiveSchema.safeParse(base).success).toBe(true);
  });

  it("accepts full valid input", () => {
    const result = createObjectiveSchema.safeParse({
      ...base,
      descriptionText: "Focus on enterprise sales",
      cycleId: "cycle-1",
      ownerUserId: "user-1",
      status: "on_track",
      priority: "high",
      startDate: "2025-01-01",
      targetDate: "2025-03-31",
      sortOrder: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    expect(createObjectiveSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects title over 500 chars", () => {
    expect(createObjectiveSchema.safeParse({ title: "a".repeat(501) }).success).toBe(false);
  });

  it("rejects invalid status", () => {
    expect(createObjectiveSchema.safeParse({ ...base, status: "unknown" }).success).toBe(false);
  });

  it("rejects invalid priority", () => {
    expect(createObjectiveSchema.safeParse({ ...base, priority: "extreme" }).success).toBe(false);
  });

  it("accepts all valid statuses", () => {
    for (const status of ["draft", "on_track", "at_risk", "off_track", "completed"]) {
      expect(createObjectiveSchema.safeParse({ ...base, status }).success).toBe(true);
    }
  });

  it("accepts all valid priorities", () => {
    for (const priority of ["low", "medium", "high", "critical"]) {
      expect(createObjectiveSchema.safeParse({ ...base, priority }).success).toBe(true);
    }
  });
});

describe("createKeyResultSchema", () => {
  const base = { title: "Close 10 enterprise deals", objectiveId: "obj-1", targetValue: 10 };

  it("accepts minimal valid input", () => {
    expect(createKeyResultSchema.safeParse(base).success).toBe(true);
  });

  it("accepts full valid input", () => {
    const result = createKeyResultSchema.safeParse({
      ...base,
      descriptionText: "Enterprise = ACV > 50k",
      cycleId: "cycle-1",
      ownerUserId: "user-1",
      metricType: "number",
      unit: "deals",
      startValue: 0,
      currentValue: 3,
      status: "on_track",
      confidence: 70,
      startDate: "2025-01-01",
      targetDate: "2025-03-31",
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing objectiveId", () => {
    expect(createKeyResultSchema.safeParse({ title: "KR", targetValue: 5 }).success).toBe(false);
  });

  it("rejects missing targetValue", () => {
    expect(createKeyResultSchema.safeParse({ title: "KR", objectiveId: "obj-1" }).success).toBe(
      false,
    );
  });

  it("rejects confidence below 0", () => {
    expect(createKeyResultSchema.safeParse({ ...base, confidence: -1 }).success).toBe(false);
  });

  it("rejects confidence above 100", () => {
    expect(createKeyResultSchema.safeParse({ ...base, confidence: 101 }).success).toBe(false);
  });

  it("rejects confidence as float", () => {
    expect(createKeyResultSchema.safeParse({ ...base, confidence: 75.5 }).success).toBe(false);
  });

  it("rejects invalid metricType", () => {
    expect(createKeyResultSchema.safeParse({ ...base, metricType: "ratio" }).success).toBe(false);
  });

  it("accepts all valid metricTypes", () => {
    for (const metricType of ["percentage", "number", "currency", "boolean", "custom"]) {
      expect(createKeyResultSchema.safeParse({ ...base, metricType }).success).toBe(true);
    }
  });
});

describe("createKeyResultUpdateSchema", () => {
  it("accepts valid input", () => {
    expect(createKeyResultUpdateSchema.safeParse({ newValue: 5 }).success).toBe(true);
  });

  it("accepts with comment", () => {
    expect(
      createKeyResultUpdateSchema.safeParse({ newValue: 5, comment: "Progress made" }).success,
    ).toBe(true);
  });

  it("rejects missing newValue", () => {
    expect(createKeyResultUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("rejects comment over 2000 chars", () => {
    expect(
      createKeyResultUpdateSchema.safeParse({ newValue: 1, comment: "x".repeat(2001) }).success,
    ).toBe(false);
  });
});
