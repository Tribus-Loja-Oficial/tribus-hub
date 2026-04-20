import { describe, expect, it } from "vitest";
import { createTaskSchema, moveTaskSchema, updateTaskSchema } from "@/lib/schemas/tasks.schemas";

describe("createTaskSchema", () => {
  const base = { title: "Fix bug", columnId: "col-1" };

  it("accepts minimal valid input", () => {
    const result = createTaskSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("accepts full valid input", () => {
    const result = createTaskSchema.safeParse({
      ...base,
      projectId: "proj-1",
      milestoneId: "ms-1",
      priority: "high",
      assigneeUserId: "user-1",
      dueDate: "2025-12-31",
      descriptionText: "Some description",
      descriptionJson: { type: "doc", content: [] },
      labelIds: ["label-1", "label-2"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createTaskSchema.safeParse({ ...base, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects title over 500 chars", () => {
    const result = createTaskSchema.safeParse({ ...base, title: "a".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("rejects missing columnId", () => {
    const result = createTaskSchema.safeParse({ title: "Fix" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid priority", () => {
    const result = createTaskSchema.safeParse({ ...base, priority: "extreme" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid dueDate format", () => {
    const result = createTaskSchema.safeParse({ ...base, dueDate: "31/12/2025" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid priorities", () => {
    for (const priority of ["low", "medium", "high", "urgent"]) {
      const result = createTaskSchema.safeParse({ ...base, priority });
      expect(result.success).toBe(true);
    }
  });
});

describe("updateTaskSchema", () => {
  it("accepts empty object (all optional)", () => {
    const result = updateTaskSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts nullable fields set to null", () => {
    const result = updateTaskSchema.safeParse({
      projectId: null,
      milestoneId: null,
      assigneeUserId: null,
      dueDate: null,
      descriptionText: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects title as empty string", () => {
    const result = updateTaskSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("accepts sortOrder as integer", () => {
    const result = updateTaskSchema.safeParse({ sortOrder: 5 });
    expect(result.success).toBe(true);
  });

  it("rejects sortOrder as float", () => {
    const result = updateTaskSchema.safeParse({ sortOrder: 1.5 });
    expect(result.success).toBe(false);
  });

  it("accepts descriptionText string", () => {
    const result = updateTaskSchema.safeParse({ descriptionText: "Updated description" });
    expect(result.success).toBe(true);
  });
});

describe("moveTaskSchema", () => {
  it("accepts valid input", () => {
    const result = moveTaskSchema.safeParse({
      taskId: "task-1",
      targetColumnId: "col-2",
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative sortOrder", () => {
    const result = moveTaskSchema.safeParse({
      taskId: "task-1",
      targetColumnId: "col-2",
      sortOrder: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing taskId", () => {
    const result = moveTaskSchema.safeParse({ targetColumnId: "col-2", sortOrder: 0 });
    expect(result.success).toBe(false);
  });
});
