import { describe, expect, it } from "vitest";
import { projectMatchesSearch } from "@/features/projects/lib/project-hierarchy-search";
import type { ProjectHierarchyItem } from "@/lib/repositories/projects.repository";

function makeProject(overrides: Partial<ProjectHierarchyItem> = {}): ProjectHierarchyItem {
  return {
    id: "proj-1",
    title: "Lançamento de Produto",
    summary: "Plano de go-to-market",
    status: "active",
    healthStatus: "on_track",
    priority: "high",
    targetDate: "2025-06-30",
    milestones: [],
    ...overrides,
  } as ProjectHierarchyItem;
}

function makeMilestone(overrides: object = {}) {
  return {
    id: "ms-1",
    title: "Beta release",
    description: "Internal beta for testers",
    status: "in_progress",
    priority: "medium",
    dueDate: "2025-05-15",
    tasks: [],
    ...overrides,
  };
}

function makeTask(overrides: object = {}) {
  return {
    id: "task-1",
    title: "Configurar ambiente",
    columnName: "Em andamento",
    columnSlug: "in-progress",
    priority: "low",
    ...overrides,
  };
}

describe("projectMatchesSearch", () => {
  it("returns true for empty query", () => {
    expect(projectMatchesSearch(makeProject(), "")).toBe(true);
    expect(projectMatchesSearch(makeProject(), "   ")).toBe(true);
  });

  it("matches by project title (exact)", () => {
    expect(projectMatchesSearch(makeProject(), "Lançamento")).toBe(true);
  });

  it("matches by project title (partial, case-insensitive)", () => {
    expect(projectMatchesSearch(makeProject(), "lançamento de produto")).toBe(true);
    expect(projectMatchesSearch(makeProject(), "LANÇAMENTO")).toBe(true);
  });

  it("matches by summary", () => {
    expect(projectMatchesSearch(makeProject(), "go-to-market")).toBe(true);
  });

  it("matches by Portuguese status label", () => {
    expect(projectMatchesSearch(makeProject({ status: "active" }), "em andamento")).toBe(true);
    expect(projectMatchesSearch(makeProject({ status: "completed" }), "concluído")).toBe(true);
    expect(projectMatchesSearch(makeProject({ status: "on_hold" }), "em pausa")).toBe(true);
    expect(projectMatchesSearch(makeProject({ status: "planned" }), "planejado")).toBe(true);
    expect(projectMatchesSearch(makeProject({ status: "cancelled" }), "cancelado")).toBe(true);
  });

  it("matches by English status key", () => {
    expect(projectMatchesSearch(makeProject({ status: "active" }), "active")).toBe(true);
  });

  it("matches by Portuguese health label", () => {
    expect(projectMatchesSearch(makeProject({ healthStatus: "on_track" }), "no rumo")).toBe(true);
    expect(projectMatchesSearch(makeProject({ healthStatus: "at_risk" }), "em risco")).toBe(true);
    expect(projectMatchesSearch(makeProject({ healthStatus: "blocked" }), "bloqueado")).toBe(true);
    expect(projectMatchesSearch(makeProject({ healthStatus: "off_track" }), "off_track")).toBe(
      true,
    );
  });

  it("matches by Portuguese priority label", () => {
    expect(projectMatchesSearch(makeProject({ priority: "high" }), "alta")).toBe(true);
    expect(projectMatchesSearch(makeProject({ priority: "low" }), "baixa")).toBe(true);
    expect(projectMatchesSearch(makeProject({ priority: "medium" }), "média")).toBe(true);
    expect(projectMatchesSearch(makeProject({ priority: "urgent" }), "urgent")).toBe(true);
  });

  it("returns false when query does not match anything", () => {
    expect(projectMatchesSearch(makeProject(), "xyz-not-found")).toBe(false);
  });

  it("matches by milestone title", () => {
    const project = makeProject({ milestones: [makeMilestone()] as never });
    expect(projectMatchesSearch(project, "beta release")).toBe(true);
  });

  it("matches by milestone description", () => {
    const project = makeProject({ milestones: [makeMilestone()] as never });
    expect(projectMatchesSearch(project, "internal beta")).toBe(true);
  });

  it("matches by milestone Portuguese status label", () => {
    const project = makeProject({ milestones: [makeMilestone({ status: "in_progress" })] as never });
    expect(projectMatchesSearch(project, "em andamento")).toBe(true);
  });

  it("matches by task title", () => {
    const ms = makeMilestone({ tasks: [makeTask()] });
    const project = makeProject({ milestones: [ms] as never });
    expect(projectMatchesSearch(project, "configurar ambiente")).toBe(true);
  });

  it("matches by task columnName", () => {
    const ms = makeMilestone({ tasks: [makeTask()] });
    const project = makeProject({ milestones: [ms] as never });
    expect(projectMatchesSearch(project, "em andamento")).toBe(true);
  });

  it("matches by task columnSlug", () => {
    const ms = makeMilestone({ tasks: [makeTask()] });
    const project = makeProject({ milestones: [ms] as never });
    expect(projectMatchesSearch(project, "in-progress")).toBe(true);
  });

  it("matches by task Portuguese priority label", () => {
    const ms = makeMilestone({ tasks: [makeTask({ priority: "high" })] });
    const project = makeProject({ milestones: [ms] as never });
    expect(projectMatchesSearch(project, "alta")).toBe(true);
  });

  it("handles project with null/undefined optional fields", () => {
    const project = makeProject({ summary: null as never, healthStatus: null as never, targetDate: null as never });
    expect(projectMatchesSearch(project, "lançamento")).toBe(true);
    expect(projectMatchesSearch(project, "xyz")).toBe(false);
  });
});
