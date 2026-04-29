import { describe, expect, it } from "vitest";
import { createMilestoneSchema, updateMilestoneSchema } from "@/lib/schemas/projects.schemas";

describe("milestone schemas", () => {
  it("accepts blocked status on create", () => {
    const result = createMilestoneSchema.safeParse({
      title: "Milestone bloqueado",
      status: "blocked",
    });
    expect(result.success).toBe(true);
  });

  it("accepts blocked status on update", () => {
    const result = updateMilestoneSchema.safeParse({
      status: "blocked",
    });
    expect(result.success).toBe(true);
  });
});
