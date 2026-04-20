import type { User, Workspace, Page, Project, Task, TaskColumn } from "@/lib/db/schema";

export const testWorkspace: Workspace = {
  id: "workspace-test-01",
  name: "Tribus Test",
  slug: "tribus-test",
  logoAssetId: null,
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const testUser: User = {
  id: "user-test-01",
  workspaceId: "workspace-test-01",
  name: "Test User",
  email: "test@tribus.com.br",
  passwordHash: "$2b$10$test",
  role: "owner",
  avatarAssetId: null,
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const testPage: Page = {
  id: "page-test-01",
  workspaceId: "workspace-test-01",
  parentPageId: null,
  isFolder: false,
  sortOrder: 0,
  title: "Test Page",
  slug: "test-page",
  icon: null,
  coverImageAssetId: null,
  excerpt: "A test page",
  contentJson: null,
  contentText: null,
  status: "draft",
  isDeleted: false,
  createdBy: "user-test-01",
  updatedBy: "user-test-01",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  archivedAt: null,
  deletedAt: null,
};

export const testColumn: TaskColumn = {
  id: "column-test-01",
  workspaceId: "workspace-test-01",
  name: "To do",
  slug: "to-do",
  colorToken: "#60a5fa",
  sortOrder: 0,
  isDefault: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const testAuthUser = {
  id: "user-test-01",
  name: "Test User",
  email: "test@tribus.com.br",
  role: "owner" as const,
  workspaceId: "workspace-test-01",
};
