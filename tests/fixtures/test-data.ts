import type { Page, Project, Task, TaskColumn } from "@/lib/types/domain";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  logoAssetId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type User = {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "owner" | "admin" | "member";
  avatarAssetId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const testWorkspace: Workspace = {
  id: "workspace-test-01",
  name: "Tribus Test",
  slug: "tribus-test",
  logoAssetId: null,
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
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
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
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
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
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
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const testAuthUser = {
  id: "user-test-01",
  name: "Test User",
  email: "test@tribus.com.br",
  role: "owner" as const,
  workspaceId: "workspace-test-01",
};
