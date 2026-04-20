// @ts-nocheck
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { NewUser, User } from "@/lib/db/schema";

export async function findUserById(id: string): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.email, email) });
}

export async function findUsersByWorkspace(workspaceId: string): Promise<User[]> {
  return db.query.users.findMany({ where: eq(users.workspaceId, workspaceId) });
}

export async function createUser(data: NewUser): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();
  if (!user) throw new Error("Failed to create user");
  return user;
}

export async function updateUser(id: string, data: Partial<NewUser>): Promise<User> {
  const [updated] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  if (!updated) throw new Error("Failed to update user");
  return updated;
}

export async function updateLastLogin(id: string): Promise<void> {
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, id));
}
