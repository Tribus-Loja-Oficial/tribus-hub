import type { UserRole } from "@/lib/db/schema";
import type { Session } from "next-auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export type AuthenticatedUser = {
  id: string;
  name: string | null | undefined;
  email: string | null | undefined;
  role: UserRole;
  workspaceId: string;
};

const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

export function hasRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * Retrieves the authenticated session user or throws UnauthorizedError.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const { auth } = await import("@/lib/auth");
  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const user = session.user as Session["user"] & {
    role: UserRole;
    workspaceId: string;
  };

  return {
    id: user.id as string,
    name: user.name,
    email: user.email,
    role: user.role,
    workspaceId: user.workspaceId,
  };
}

/**
 * Requires a minimum role level.
 */
export async function requireRole(minRole: UserRole): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (!hasRole(user.role, minRole)) {
    throw new ForbiddenError(`Role "${minRole}" or higher required`);
  }

  return user;
}

/**
 * Checks workspace access (user must belong to the given workspace).
 */
export function requireWorkspaceAccess(user: AuthenticatedUser, workspaceId: string): void {
  if (user.workspaceId !== workspaceId) {
    throw new ForbiddenError("Access to this workspace is not allowed");
  }
}

export function canEditPage(user: AuthenticatedUser): boolean {
  return hasRole(user.role, "member");
}

export function canManageProject(user: AuthenticatedUser): boolean {
  return hasRole(user.role, "admin");
}

export function canManageUsers(user: AuthenticatedUser): boolean {
  return hasRole(user.role, "owner");
}

export function canDeleteEntity(user: AuthenticatedUser): boolean {
  return hasRole(user.role, "admin");
}
