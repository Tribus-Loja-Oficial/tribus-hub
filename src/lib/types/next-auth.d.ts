import type { UserRole } from "@/lib/types/domain";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      workspaceId: string;
      consumerId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    workspaceId: string;
    cdsConsumerId?: string;
    cdsRefreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    workspaceId: string;
    cdsConsumerId?: string;
    cdsRefreshToken?: string;
  }
}
