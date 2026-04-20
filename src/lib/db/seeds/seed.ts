// @ts-nocheck
import { db } from "../client";
import { workspaces, users, taskColumns, pages } from "../schema";
import bcrypt from "bcryptjs";
import { createId } from "@/lib/utils/ids";

async function seed() {
  console.warn("Starting seed...");

  // 1. Workspace
  const workspaceId = createId();
  const [workspace] = await db
    .insert(workspaces)
    .values({
      id: workspaceId,
      name: "Tribus",
      slug: "tribus",
    })
    .onConflictDoNothing()
    .returning();

  const wid = workspace?.id ?? workspaceId;
  console.warn("Workspace:", wid);

  // 2. Owner user
  const userId = createId();
  const passwordHash = await bcrypt.hash("changeme123!", 10);

  const [user] = await db
    .insert(users)
    .values({
      id: userId,
      workspaceId: wid,
      name: "Admin Tribus",
      email: "admin@tribus.com.br",
      passwordHash,
      role: "owner",
    })
    .onConflictDoNothing()
    .returning();

  const uid = user?.id ?? userId;
  console.warn("User:", uid);

  // 3. Task columns
  const defaultColumns = [
    { name: "Backlog", slug: "backlog", colorToken: "#94a3b8", sortOrder: 0 },
    { name: "To do", slug: "to-do", colorToken: "#60a5fa", sortOrder: 1000, isDefault: true },
    { name: "In progress", slug: "in-progress", colorToken: "#f59e0b", sortOrder: 2000 },
    { name: "Blocked", slug: "blocked", colorToken: "#f87171", sortOrder: 3000 },
    { name: "Done", slug: "done", colorToken: "#34d399", sortOrder: 4000 },
  ];

  for (const col of defaultColumns) {
    await db
      .insert(taskColumns)
      .values({ ...col, workspaceId: wid, isDefault: col.isDefault ?? false })
      .onConflictDoNothing();
  }
  console.warn("Task columns seeded");

  // 4. Onboarding pages
  const onboardingPages = [
    {
      title: "Bem-vindo ao Tribus Hub",
      icon: "👋",
      excerpt: "Guia de boas-vindas ao sistema interno da Tribus.",
    },
    {
      title: "Visão e Posicionamento",
      icon: "🎯",
      excerpt: "Visão estratégica e posicionamento da Tribus.",
    },
    {
      title: "Processos Internos",
      icon: "⚙️",
      excerpt: "Documentação dos processos internos.",
    },
  ];

  for (const p of onboardingPages) {
    await db
      .insert(pages)
      .values({
        workspaceId: wid,
        title: p.title,
        slug: p.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        icon: p.icon,
        excerpt: p.excerpt,
        status: "published",
        createdBy: uid,
        updatedBy: uid,
      })
      .onConflictDoNothing();
  }
  console.warn("Onboarding pages seeded");

  console.warn("Seed completed successfully!");
  console.warn("");
  console.warn("Login credentials:");
  console.warn("  Email: admin@tribus.com.br");
  console.warn("  Password: changeme123!");
  console.warn("");
  console.warn("Change the password after first login.");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
