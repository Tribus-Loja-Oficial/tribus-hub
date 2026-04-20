import type { UserRole } from "@/lib/db/schema";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      workspaceId: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    workspaceId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    workspaceId: string;
  }
}
