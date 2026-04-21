import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { env } from "@/lib/config/env";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { verifyCdsAccessToken } from "@/lib/integrations/cds/jwt-verify";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  turnstileToken: z.string().optional(),
});

type CdsLoginData = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  tokenType?: string;
};

type HubCdsResolveUser = {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        turnstileToken: { label: "Turnstile", type: "text" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, turnstileToken } = parsed.data;

        const cdsBase = env.CDS_API_URL?.replace(/\/$/, "");
        if (!cdsBase?.trim() || !env.CDS_JWT_SECRET?.trim()) {
          console.error("CDS_API_URL and CDS_JWT_SECRET must be configured for login.");
          return null;
        }

        let cdsRes: Response;
        try {
          cdsRes = await fetch(`${cdsBase}/auth/login`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              identifier: email,
              password,
              turnstileToken: turnstileToken ?? "",
            }),
            cache: "no-store",
          });
        } catch {
          return null;
        }

        const cdsBody = (await cdsRes.json().catch(() => null)) as {
          data?: CdsLoginData;
          message?: string;
        } | null;

        if (!cdsRes.ok || !cdsBody?.data?.accessToken || !cdsBody.data.refreshToken) {
          return null;
        }

        let claims: Awaited<ReturnType<typeof verifyCdsAccessToken>>;
        try {
          claims = await verifyCdsAccessToken(cdsBody.data.accessToken, env.CDS_JWT_SECRET, {
            issuer: env.CDS_JWT_ISSUER,
            audience: env.CDS_JWT_AUDIENCE,
          });
        } catch {
          return null;
        }

        const hubGrant = claims.grants?.hub;
        if (!hubGrant?.role) return null;

        let resolved: HubCdsResolveUser;
        try {
          resolved = await hubApiFetch<HubCdsResolveUser>({
            method: "POST",
            path: "/v1/internal/auth/cds-resolve-user",
            body: {
              consumerId: claims.sub,
              email,
              hubGrantRole: hubGrant.role,
            },
          });
        } catch {
          return null;
        }

        return {
          id: resolved.id,
          name: resolved.name,
          email: resolved.email,
          role: resolved.role,
          workspaceId: resolved.workspaceId,
          cdsConsumerId: claims.sub,
          cdsRefreshToken: cdsBody.data.refreshToken,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token["id"] = user.id;
        token["role"] = (user as { role: string }).role;
        token["workspaceId"] = (user as { workspaceId: string }).workspaceId;
        const u = user as { cdsConsumerId?: string; cdsRefreshToken?: string };
        if (u.cdsConsumerId) token["cdsConsumerId"] = u.cdsConsumerId;
        if (u.cdsRefreshToken) token["cdsRefreshToken"] = u.cdsRefreshToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token["id"] as string;
        (session.user as { role: string }).role = token["role"] as string;
        (session.user as { workspaceId: string }).workspaceId = token["workspaceId"] as string;
        const consumerId = token["cdsConsumerId"] as string | undefined;
        if (consumerId) (session.user as { consumerId?: string }).consumerId = consumerId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
